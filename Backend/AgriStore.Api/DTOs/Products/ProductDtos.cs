using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Products;

public sealed record ProductResponse(
    Guid Id,
    string Code,
    string Name,
    Guid CategoryId,
    string CategoryName,
    Guid UnitId,
    string UnitName,
    string? Description,
    string? ShortDescription,
    decimal CostPrice,
    decimal SellingPrice,
    decimal MinStockAlert,
    int? ExpiryDays,
    bool IsActive,
    bool IsFeatured,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyCollection<ProductImageResponse> Images);

public sealed record ProductListItemResponse(
    Guid Id,
    string Code,
    string Name,
    Guid CategoryId,
    string CategoryName,
    Guid UnitId,
    string UnitName,
    string? Description,
    string? ShortDescription,
    decimal CostPrice,
    decimal SellingPrice,
    decimal MinStockAlert,
    int? ExpiryDays,
    bool IsActive,
    bool IsFeatured,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    string? MainImageUrl);

public sealed record ProductImageResponse(Guid Id, string ImageUrl, bool IsMain, int SortOrder);

public sealed record ProductListQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    Guid? CategoryId = null,
    bool? IsActive = null,
    Guid? UnitId = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    bool? IsFeatured = null,
    string SortBy = "name",
    string SortDirection = "asc");

public sealed record ProductListResponse(
    IReadOnlyCollection<ProductListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record CreateProductRequest
{
    [Required, MaxLength(50)]
    public required string Code { get; init; }

    [Required, MaxLength(200)]
    public required string Name { get; init; }

    public Guid CategoryId { get; init; }

    public Guid UnitId { get; init; }

    [MaxLength(2000)]
    public string? Description { get; init; }

    [MaxLength(500)]
    public string? ShortDescription { get; init; }

    public decimal CostPrice { get; init; }

    public decimal SellingPrice { get; init; }

    public decimal MinStockAlert { get; init; }

    public int? ExpiryDays { get; init; }

    public bool IsActive { get; init; } = true;

    public bool IsFeatured { get; init; }
}

public sealed record UpdateProductRequest
{
    [Required, MaxLength(50)]
    public required string Code { get; init; }

    [Required, MaxLength(200)]
    public required string Name { get; init; }

    public Guid CategoryId { get; init; }

    public Guid UnitId { get; init; }

    [MaxLength(2000)]
    public string? Description { get; init; }

    [MaxLength(500)]
    public string? ShortDescription { get; init; }

    public decimal CostPrice { get; init; }

    public decimal SellingPrice { get; init; }

    public decimal MinStockAlert { get; init; }

    public int? ExpiryDays { get; init; }

    public bool IsActive { get; init; } = true;

    public bool IsFeatured { get; init; }
}

public sealed record ProductStatusRequest(bool IsActive);