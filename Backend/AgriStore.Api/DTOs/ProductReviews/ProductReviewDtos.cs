using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.ProductReviews;

/// <summary>Payload for submitting a product review.</summary>
public sealed record CreateProductReviewRequest
{
    /// <summary>Rating from one to five stars.</summary>
    [Range(1, 5)]
    public int Rating { get; init; }

    /// <summary>Optional review text.</summary>
    [MaxLength(2000)]
    public string? Comment { get; init; }
}

/// <summary>Payload for approving or rejecting a product review.</summary>
public sealed record SetProductReviewApprovalRequest
{
    /// <summary>True to publish the review; false to keep it hidden.</summary>
    public required bool IsApproved { get; init; }
}

/// <summary>A product review shown to API consumers.</summary>
public sealed record ProductReviewResponse(
    Guid Id,
    Guid ProductId,
    string CustomerName,
    int Rating,
    string? Comment,
    bool IsApproved,
    DateTimeOffset CreatedAt);

/// <summary>A paginated list of product reviews.</summary>
public sealed record ProductReviewListResponse(
    IReadOnlyCollection<ProductReviewResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

/// <summary>Paging options for reviews of a product.</summary>
public sealed record ProductReviewListQuery(
    int Page = 1,
    int PageSize = 20,
    bool IncludePending = false);
