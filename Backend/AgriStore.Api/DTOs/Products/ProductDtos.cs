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
    [Required, MaxLength(50), RegularExpression(@"^\s*[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*\s*$")]
    public required string Code { get; init; }

    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [Required]
    public Guid CategoryId { get; init; }

    [Required]
    public Guid UnitId { get; init; }

    [MaxLength(2000)]
    public string? Description { get; init; }

    [MaxLength(500)]
    public string? ShortDescription { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal CostPrice { get; init; }

    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal SellingPrice { get; init; }

    [Range(typeof(decimal), "0", "999999999999999.999")]
    public decimal MinStockAlert { get; init; }

    [Range(1, int.MaxValue)]
    public int? ExpiryDays { get; init; }

    public bool IsActive { get; init; } = true;

    public bool IsFeatured { get; init; }
}

public sealed record UpdateProductRequest
{
    [Required, MaxLength(50), RegularExpression(@"^\s*[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*\s*$")]
    public required string Code { get; init; }

    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [Required]
    public Guid CategoryId { get; init; }

    [Required]
    public Guid UnitId { get; init; }

    [MaxLength(2000)]
    public string? Description { get; init; }

    [MaxLength(500)]
    public string? ShortDescription { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal CostPrice { get; init; }

    [Range(typeof(decimal), "0.01", "9999999999999999.99")]
    public decimal SellingPrice { get; init; }

    [Range(typeof(decimal), "0", "999999999999999.999")]
    public decimal MinStockAlert { get; init; }

    [Range(1, int.MaxValue)]
    public int? ExpiryDays { get; init; }

    public bool IsActive { get; init; } = true;

    public bool IsFeatured { get; init; }
}

public sealed record ProductStatusRequest(bool IsActive);