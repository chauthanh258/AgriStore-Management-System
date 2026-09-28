using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Products;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AgriStore.Api.Services;

public sealed class ProductService(ApplicationDbContext dbContext) : IProductService
{
    private const int MaxPageSize = 100;

    public async Task<ProductListResponse> GetPagedAsync(ProductListQuery query, CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var productsQuery =
            from product in dbContext.Products.AsNoTracking()
            join category in dbContext.Categories.AsNoTracking() on product.CategoryId equals category.Id
            join unit in dbContext.Units.AsNoTracking() on product.UnitId equals unit.Id
            select new ProductResponse(
                product.Id,
                product.Code,
                product.Name,
                product.CategoryId,
                category.Name,
                product.UnitId,
                unit.Name,
                product.Description,
                product.ShortDescription,
                product.CostPrice,
                product.SellingPrice,
                product.MinStockAlert,
                product.ExpiryDays,
                product.IsActive,
                product.IsFeatured,
                product.CreatedAt,
                product.UpdatedAt);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = $"%{query.Search.Trim()}%";
            productsQuery = productsQuery.Where(product =>
                EF.Functions.ILike(product.Code, search) || EF.Functions.ILike(product.Name, search));
        }

        if (query.CategoryId.HasValue)
        {
            productsQuery = productsQuery.Where(product => product.CategoryId == query.CategoryId.Value);
        }

        if (query.IsActive.HasValue)
        {
            productsQuery = productsQuery.Where(product => product.IsActive == query.IsActive.Value);
        }

        var totalCount = await productsQuery.CountAsync(cancellationToken);
        var skip = (int)Math.Min((long)(page - 1) * pageSize, int.MaxValue);
        var items = await productsQuery
            .OrderBy(product => product.Name)
            .ThenBy(product => product.Code)
            .ThenBy(product => product.Id)
            .Skip(skip)
            .Take(pageSize)
            .ToArrayAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new ProductListResponse(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<ProductResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await (
            from product in dbContext.Products.AsNoTracking()
            join category in dbContext.Categories.AsNoTracking() on product.CategoryId equals category.Id
            join unit in dbContext.Units.AsNoTracking() on product.UnitId equals unit.Id
            where product.Id == id
            select new ProductResponse(
                product.Id,
                product.Code,
                product.Name,
                product.CategoryId,
                category.Name,
                product.UnitId,
                unit.Name,
                product.Description,
                product.ShortDescription,
                product.CostPrice,
                product.SellingPrice,
                product.MinStockAlert,
                product.ExpiryDays,
                product.IsActive,
                product.IsFeatured,
                product.CreatedAt,
                product.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<ProductServiceResult<ProductResponse>> CreateAsync(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var normalized = Normalize(request.Code, request.Name, request.Description, request.ShortDescription);
        var validationError = await ValidateAsync(
            normalized.Code,
            normalized.Name,
            request.CategoryId,
            request.UnitId,
            null,
            cancellationToken);

        if (validationError is not null)
        {
            return ProductServiceResult<ProductResponse>.Failure(validationError.Value.StatusCode, validationError.Value.Message);
        }

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = normalized.Code,
            Name = normalized.Name,
            CategoryId = request.CategoryId,
            UnitId = request.UnitId,
            Description = normalized.Description,
            ShortDescription = normalized.ShortDescription,
            CostPrice = request.CostPrice,
            SellingPrice = request.SellingPrice,
            MinStockAlert = request.MinStockAlert,
            ExpiryDays = request.ExpiryDays,
            IsActive = request.IsActive,
            IsFeatured = request.IsFeatured
        };

        dbContext.Products.Add(product);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            return ProductServiceResult<ProductResponse>.Failure(409, "Mã sản phẩm đã tồn tại.");
        }
        catch (DbUpdateException exception) when (IsForeignKeyViolation(exception))
        {
            return ProductServiceResult<ProductResponse>.Failure(400, "Danh mục hoặc đơn vị tính không tồn tại.");
        }

        return ProductServiceResult<ProductResponse>.Success(
            (await GetByIdAsync(product.Id, cancellationToken))!);
    }

    public async Task<ProductServiceResult<ProductResponse>> UpdateAsync(
        Guid id,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (product is null)
        {
            return ProductServiceResult<ProductResponse>.Failure(404, "Không tìm thấy sản phẩm.");
        }

        var normalized = Normalize(request.Code, request.Name, request.Description, request.ShortDescription);
        var validationError = await ValidateAsync(
            normalized.Code,
            normalized.Name,
            request.CategoryId,
            request.UnitId,
            id,
            cancellationToken);

        if (validationError is not null)
        {
            return ProductServiceResult<ProductResponse>.Failure(validationError.Value.StatusCode, validationError.Value.Message);
        }

        product.Code = normalized.Code;
        product.Name = normalized.Name;
        product.CategoryId = request.CategoryId;
        product.UnitId = request.UnitId;
        product.Description = normalized.Description;
        product.ShortDescription = normalized.ShortDescription;
        product.CostPrice = request.CostPrice;
        product.SellingPrice = request.SellingPrice;
        product.MinStockAlert = request.MinStockAlert;
        product.ExpiryDays = request.ExpiryDays;
        product.IsActive = request.IsActive;
        product.IsFeatured = request.IsFeatured;
        product.UpdatedAt = DateTime.UtcNow;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            return ProductServiceResult<ProductResponse>.Failure(409, "Mã sản phẩm đã được sử dụng.");
        }
        catch (DbUpdateException exception) when (IsForeignKeyViolation(exception))
        {
            return ProductServiceResult<ProductResponse>.Failure(400, "Danh mục hoặc đơn vị tính không tồn tại.");
        }

        return ProductServiceResult<ProductResponse>.Success((await GetByIdAsync(id, cancellationToken))!);
    }

    public async Task<ProductServiceResult<ProductResponse>> SetActiveAsync(
        Guid id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (product is null)
        {
            return ProductServiceResult<ProductResponse>.Failure(404, "Không tìm thấy sản phẩm.");
        }

        product.IsActive = isActive;
        product.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return ProductServiceResult<ProductResponse>.Success((await GetByIdAsync(id, cancellationToken))!);
    }

    public Task<ProductServiceResult<ProductResponse>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        return SetActiveAsync(id, false, cancellationToken);
    }

    private async Task<(int StatusCode, string Message)?> ValidateAsync(
        string code,
        string name,
        Guid categoryId,
        Guid unitId,
        Guid? excludedId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
        {
            return (400, "Mã và tên sản phẩm không được để trống.");
        }

        if (categoryId == Guid.Empty || unitId == Guid.Empty)
        {
            return (400, "Danh mục và đơn vị tính là bắt buộc.");
        }

        if (await dbContext.Products.AsNoTracking().AnyAsync(
                product => product.Code == code && (!excludedId.HasValue || product.Id != excludedId.Value),
                cancellationToken))
        {
            return (409, "Mã sản phẩm đã tồn tại.");
        }

        if (!await dbContext.Categories.AsNoTracking().AnyAsync(category => category.Id == categoryId, cancellationToken))
        {
            return (400, "Danh mục không tồn tại.");
        }

        if (!await dbContext.Units.AsNoTracking().AnyAsync(unit => unit.Id == unitId, cancellationToken))
        {
            return (400, "Đơn vị tính không tồn tại.");
        }

        return null;
    }

    private static (string Code, string Name, string? Description, string? ShortDescription) Normalize(
        string code,
        string name,
        string? description,
        string? shortDescription)
    {
        return (
            code?.Trim() ?? string.Empty,
            name?.Trim() ?? string.Empty,
            NormalizeOptional(description),
            NormalizeOptional(shortDescription));
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static bool IsUniqueViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
            postgresException.SqlState == PostgresErrorCodes.UniqueViolation;
    }

    private static bool IsForeignKeyViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
            postgresException.SqlState == PostgresErrorCodes.ForeignKeyViolation;
    }
}