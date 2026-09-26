using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Categories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AgriStore.Api.Services;

public sealed class CategoryService(ApplicationDbContext dbContext) : ICategoryService
{
    private const int MaxPageSize = 100;

    public async Task<CategoryListResponse> GetPagedAsync(
        CategoryListQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var categoriesQuery = dbContext.Categories.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            categoriesQuery = categoriesQuery.Where(category =>
                category.Name.Contains(search) ||
                (category.Description != null && category.Description.Contains(search)));
        }

        if (query.ParentId.HasValue)
        {
            categoriesQuery = categoriesQuery.Where(category => category.ParentId == query.ParentId.Value);
        }

        if (query.IsActive.HasValue)
        {
            categoriesQuery = categoriesQuery.Where(category => category.IsActive == query.IsActive.Value);
        }

        var totalCount = await categoriesQuery.CountAsync(cancellationToken);
        var categories = await categoriesQuery
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = categories.Select(MapCategory).ToArray();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new CategoryListResponse(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<CategoryResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return category is null ? null : MapCategory(category);
    }

    public async Task<CategoryServiceResult<CategoryResponse>> CreateAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return CategoryServiceResult<CategoryResponse>.Failure(400, "Tên danh mục không được để trống.");
        }

        var nameExists = await dbContext.Categories
            .AsNoTracking()
            .AnyAsync(category => category.Name == name, cancellationToken);

        if (nameExists)
        {
            return CategoryServiceResult<CategoryResponse>.Failure(409, "Tên danh mục đã tồn tại.");
        }

        var parentError = await ValidateParentAsync(request.ParentId, null, request.IsActive, cancellationToken);
        if (parentError is not null)
        {
            return CategoryServiceResult<CategoryResponse>.Failure(parentError.Value.StatusCode, parentError.Value.Message);
        }

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = NormalizeOptional(request.Description),
            ParentId = request.ParentId,
            Image = NormalizeOptional(request.Image),
            IsActive = request.IsActive,
            SortOrder = request.SortOrder
        };

        dbContext.Categories.Add(category);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueNameViolation(exception))
        {
            return CategoryServiceResult<CategoryResponse>.Failure(409, "Tên danh mục đã tồn tại.");
        }

        return CategoryServiceResult<CategoryResponse>.Success(MapCategory(category));
    }

    public async Task<CategoryServiceResult<CategoryResponse>> UpdateAsync(
        Guid id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (category is null)
        {
            return CategoryServiceResult<CategoryResponse>.Failure(404, "Không tìm thấy danh mục.");
        }

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return CategoryServiceResult<CategoryResponse>.Failure(400, "Tên danh mục không được để trống.");
        }

        var duplicateNameExists = await dbContext.Categories
            .AsNoTracking()
            .AnyAsync(item => item.Id != id && item.Name == name, cancellationToken);

        if (duplicateNameExists)
        {
            return CategoryServiceResult<CategoryResponse>.Failure(409, "Tên danh mục đã được sử dụng.");
        }

        var parentError = await ValidateParentAsync(request.ParentId, id, request.IsActive, cancellationToken);
        if (parentError is not null)
        {
            return CategoryServiceResult<CategoryResponse>.Failure(parentError.Value.StatusCode, parentError.Value.Message);
        }

        if (!request.IsActive && await HasActiveDescendantsAsync(id, cancellationToken))
        {
            return CategoryServiceResult<CategoryResponse>.Failure(
                409,
                "Không thể vô hiệu hóa danh mục khi vẫn còn danh mục con đang hoạt động.");
        }

        category.Name = name;
        category.Description = NormalizeOptional(request.Description);
        category.ParentId = request.ParentId;
        category.Image = NormalizeOptional(request.Image);
        category.IsActive = request.IsActive;
        category.SortOrder = request.SortOrder;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueNameViolation(exception))
        {
            return CategoryServiceResult<CategoryResponse>.Failure(409, "Tên danh mục đã được sử dụng.");
        }

        return CategoryServiceResult<CategoryResponse>.Success(MapCategory(category));
    }

    public async Task<CategoryServiceResult<CategoryResponse>> SetActiveAsync(
        Guid id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (category is null)
        {
            return CategoryServiceResult<CategoryResponse>.Failure(404, "Không tìm thấy danh mục.");
        }

        if (isActive)
        {
            var parentError = await ValidateParentAsync(category.ParentId, id, true, cancellationToken);
            if (parentError is not null)
            {
                return CategoryServiceResult<CategoryResponse>.Failure(parentError.Value.StatusCode, parentError.Value.Message);
            }
        }
        else if (await HasActiveDescendantsAsync(id, cancellationToken))
        {
            return CategoryServiceResult<CategoryResponse>.Failure(
                409,
                "Không thể vô hiệu hóa danh mục khi vẫn còn danh mục con đang hoạt động.");
        }

        category.IsActive = isActive;
        await dbContext.SaveChangesAsync(cancellationToken);
        return CategoryServiceResult<CategoryResponse>.Success(MapCategory(category));
    }

    public Task<CategoryServiceResult<CategoryResponse>> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        return SetActiveAsync(id, false, cancellationToken);
    }

    private async Task<(int StatusCode, string Message)?> ValidateParentAsync(
        Guid? parentId,
        Guid? categoryId,
        bool isActive,
        CancellationToken cancellationToken)
    {
        if (!parentId.HasValue)
        {
            return null;
        }

        var categories = await dbContext.Categories
            .AsNoTracking()
            .Select(item => new CategoryHierarchyItem(item.Id, item.ParentId, item.IsActive))
            .ToListAsync(cancellationToken);
        var categoriesById = categories.ToDictionary(item => item.Id);

        if (!categoriesById.TryGetValue(parentId.Value, out var parent))
        {
            return (400, "Danh mục cha không tồn tại.");
        }

        var visited = new HashSet<Guid>();
        var ancestorId = parentId.Value;
        while (true)
        {
            if (categoryId == ancestorId)
            {
                return (409, "Không thể tạo chu trình trong cây danh mục.");
            }

            if (!visited.Add(ancestorId))
            {
                return (409, "Cấu trúc danh mục hiện có chứa chu trình.");
            }

            var ancestor = categoriesById[ancestorId];
            if (isActive && !ancestor.IsActive)
            {
                return (409, "Không thể gắn danh mục đang hoạt động dưới danh mục cha không hoạt động.");
            }

            if (!ancestor.ParentId.HasValue)
            {
                break;
            }

            ancestorId = ancestor.ParentId.Value;
            if (!categoriesById.ContainsKey(ancestorId))
            {
                return (409, "Cấu trúc danh mục hiện có tham chiếu tới danh mục cha không tồn tại.");
            }
        }

        return null;
    }

    private async Task<bool> HasActiveDescendantsAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var categories = await dbContext.Categories
            .AsNoTracking()
            .Select(item => new CategoryHierarchyItem(item.Id, item.ParentId, item.IsActive))
            .ToListAsync(cancellationToken);
        var childrenByParentId = categories
            .Where(item => item.ParentId.HasValue)
            .GroupBy(item => item.ParentId!.Value)
            .ToDictionary(group => group.Key, group => group.ToArray());

        var visited = new HashSet<Guid> { categoryId };
        var pending = new Queue<Guid>();
        pending.Enqueue(categoryId);

        while (pending.TryDequeue(out var currentId))
        {
            if (!childrenByParentId.TryGetValue(currentId, out var children))
            {
                continue;
            }

            foreach (var child in children)
            {
                if (!visited.Add(child.Id))
                {
                    continue;
                }

                if (child.IsActive)
                {
                    return true;
                }

                pending.Enqueue(child.Id);
            }
        }

        return false;
    }

    private static bool IsUniqueNameViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
            postgresException.SqlState == PostgresErrorCodes.UniqueViolation;
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static CategoryResponse MapCategory(Category category)
    {
        return new CategoryResponse(
            category.Id,
            category.Name,
            category.Description,
            category.ParentId,
            category.Image,
            category.IsActive,
            category.SortOrder);
    }

    private sealed record CategoryHierarchyItem(Guid Id, Guid? ParentId, bool IsActive);
}
