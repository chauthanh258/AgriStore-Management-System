using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Products;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AgriStore.Api.Services;

public sealed class ProductService(
    ApplicationDbContext dbContext,
    IProductImageStorage imageStorage,
    ILogger<ProductService> logger) : IProductService
{
    private const int MaxPageSize = 100;

    public async Task<ProductListResponse> GetPagedAsync(ProductListQuery query, CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var productsQuery = dbContext.Products.AsNoTracking();

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

        if (query.UnitId.HasValue)
        {
            productsQuery = productsQuery.Where(product => product.UnitId == query.UnitId.Value);
        }

        if (query.MinPrice.HasValue)
        {
            productsQuery = productsQuery.Where(product => product.SellingPrice >= query.MinPrice.Value);
        }

        if (query.MaxPrice.HasValue)
        {
            productsQuery = productsQuery.Where(product => product.SellingPrice <= query.MaxPrice.Value);
        }

        if (query.IsFeatured.HasValue)
        {
            productsQuery = productsQuery.Where(product => product.IsFeatured == query.IsFeatured.Value);
        }

        var totalCount = await productsQuery.CountAsync(cancellationToken);
        var skip = (int)Math.Min((long)(page - 1) * pageSize, int.MaxValue);
        var sortBy = query.SortBy?.Trim().ToLowerInvariant() ?? "name";
        var descending = string.Equals(query.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var orderedProductsQuery = sortBy switch
        {
            "code" => descending
                ? productsQuery.OrderByDescending(product => product.Code)
                : productsQuery.OrderBy(product => product.Code),
            "sellingprice" => descending
                ? productsQuery.OrderByDescending(product => product.SellingPrice)
                : productsQuery.OrderBy(product => product.SellingPrice),
            "createdat" => descending
                ? productsQuery.OrderByDescending(product => product.CreatedAt)
                : productsQuery.OrderBy(product => product.CreatedAt),
            _ => descending
                ? productsQuery.OrderByDescending(product => product.Name)
                : productsQuery.OrderBy(product => product.Name)
        };
        var pageProductsQuery = orderedProductsQuery
            .ThenBy(product => product.Code)
            .ThenBy(product => product.Id)
            .Skip(skip)
            .Take(pageSize);
        var items = await (
            from product in pageProductsQuery
            join category in dbContext.Categories.AsNoTracking() on product.CategoryId equals category.Id
            join unit in dbContext.Units.AsNoTracking() on product.UnitId equals unit.Id
            select new ProductListItemResponse(
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
                product.UpdatedAt,
                dbContext.ProductImages.AsNoTracking()
                    .Where(image => image.ProductId == product.Id && image.IsMain)
                    .Select(image => image.ImageUrl)
                    .FirstOrDefault()))
            .ToArrayAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new ProductListResponse(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<ProductResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var productResponse = await (
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
                product.UpdatedAt,
                Array.Empty<ProductImageResponse>()))
            .SingleOrDefaultAsync(cancellationToken);

        if (productResponse is null)
        {
            return null;
        }

        var images = await dbContext.ProductImages.AsNoTracking()
            .Where(image => image.ProductId == id)
            .OrderBy(image => image.SortOrder)
            .ThenBy(image => image.Id)
            .Select(image => new ProductImageResponse(image.Id, image.ImageUrl, image.IsMain, image.SortOrder))
            .ToArrayAsync(cancellationToken);

        return productResponse with { Images = images };
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

    public async Task<ProductServiceResult<ProductImageResponse>> UploadImageAsync(
        Guid productId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.Products.AsNoTracking().AnyAsync(product => product.Id == productId, cancellationToken))
        {
            return ProductServiceResult<ProductImageResponse>.Failure(404, "Không tìm thấy sản phẩm.");
        }

        var existingImages = await dbContext.ProductImages
            .Where(image => image.ProductId == productId)
            .ToArrayAsync(cancellationToken);
        var storedImage = await imageStorage.SaveAsync(file, cancellationToken);
        if (!storedImage.Succeeded)
        {
            return ProductServiceResult<ProductImageResponse>.Failure(400, storedImage.Error!);
        }

        var image = new ProductImage
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            ImageUrl = storedImage.ImageUrl!,
            IsMain = !existingImages.Any(item => item.IsMain),
            SortOrder = existingImages.Length == 0 ? 0 : existingImages.Max(item => item.SortOrder) + 1
        };

        dbContext.ProductImages.Add(image);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await TryDeleteStoredImageAsync(image.ImageUrl);
            throw;
        }

        return ProductServiceResult<ProductImageResponse>.Success(ToImageResponse(image));
    }

    public async Task<ProductServiceResult<ProductImageResponse>> SetMainImageAsync(
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var images = await dbContext.ProductImages
            .Where(image => image.ProductId == productId)
            .ToArrayAsync(cancellationToken);
        var target = images.SingleOrDefault(image => image.Id == imageId);
        if (target is null)
        {
            return ProductServiceResult<ProductImageResponse>.Failure(404, "Không tìm thấy ảnh của sản phẩm.");
        }

        foreach (var image in images)
        {
            image.IsMain = false;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        target.IsMain = true;
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ProductServiceResult<ProductImageResponse>.Success(ToImageResponse(target));
    }

    public async Task<ProductServiceResult<ProductImageResponse>> DeleteImageAsync(
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var images = await dbContext.ProductImages
            .Where(image => image.ProductId == productId)
            .ToArrayAsync(cancellationToken);
        var imageToDelete = images.SingleOrDefault(image => image.Id == imageId);
        if (imageToDelete is null)
        {
            return ProductServiceResult<ProductImageResponse>.Failure(404, "Không tìm thấy ảnh của sản phẩm.");
        }

        var replacement = imageToDelete.IsMain
            ? images.Where(image => image.Id != imageId)
                .OrderBy(image => image.SortOrder)
                .ThenBy(image => image.Id)
                .FirstOrDefault()
            : null;

        dbContext.ProductImages.Remove(imageToDelete);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (replacement is not null)
        {
            replacement.IsMain = true;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        await TryDeleteStoredImageAsync(imageToDelete.ImageUrl);

        return ProductServiceResult<ProductImageResponse>.Success(ToImageResponse(imageToDelete));
    }

    private async Task TryDeleteStoredImageAsync(string imageUrl)
    {
        try
        {
            await imageStorage.DeleteAsync(imageUrl, CancellationToken.None);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Không thể xóa file ảnh sản phẩm {ImageUrl}.", imageUrl);
        }
    }

    private static ProductImageResponse ToImageResponse(ProductImage image)
    {
        return new ProductImageResponse(image.Id, image.ImageUrl, image.IsMain, image.SortOrder);
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