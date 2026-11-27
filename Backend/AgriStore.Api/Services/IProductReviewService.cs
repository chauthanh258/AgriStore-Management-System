using AgriStore.Api.DTOs.ProductReviews;

namespace AgriStore.Api.Services;

public interface IProductReviewService
{
    Task<ProductReviewListResponse?> GetByProductAsync(
        Guid productId,
        ProductReviewListQuery query,
        CancellationToken cancellationToken);

    Task<ProductReviewServiceResult<ProductReviewResponse>> CreateAsync(
        Guid productId,
        Guid userId,
        CreateProductReviewRequest request,
        CancellationToken cancellationToken);

    Task<ProductReviewServiceResult<ProductReviewResponse>> SetApprovalAsync(
        Guid reviewId,
        bool isApproved,
        CancellationToken cancellationToken);

    Task<ProductReviewServiceResult<bool>> DeleteAsync(
        Guid reviewId,
        Guid userId,
        bool isModerator,
        CancellationToken cancellationToken);
}

public sealed record ProductReviewServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static ProductReviewServiceResult<T> Success(T value) => new(value, 200, []);

    public static ProductReviewServiceResult<T> Failure(int statusCode, params string[] errors) =>
        new(default, statusCode, errors);
}
