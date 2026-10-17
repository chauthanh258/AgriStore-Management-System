using AgriStore.Api.DTOs.Products;

namespace AgriStore.Api.Services;

public interface IProductService
{
    Task<ProductListResponse> GetPagedAsync(ProductListQuery query, CancellationToken cancellationToken);
    Task<ProductResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<ProductServiceResult<ProductResponse>> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<ProductServiceResult<ProductResponse>> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken);
    Task<ProductServiceResult<ProductResponse>> SetActiveAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<ProductServiceResult<ProductResponse>> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<ProductServiceResult<ProductImageResponse>> UploadImageAsync(Guid productId, IFormFile file, CancellationToken cancellationToken);
    Task<ProductServiceResult<ProductImageResponse>> SetMainImageAsync(Guid productId, Guid imageId, CancellationToken cancellationToken);
    Task<ProductServiceResult<ProductImageResponse>> DeleteImageAsync(Guid productId, Guid imageId, CancellationToken cancellationToken);
}

public sealed record ProductServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static ProductServiceResult<T> Success(T value) => new(value, 200, []);
    public static ProductServiceResult<T> Failure(int statusCode, params string[] errors) => new(default, statusCode, errors);
}