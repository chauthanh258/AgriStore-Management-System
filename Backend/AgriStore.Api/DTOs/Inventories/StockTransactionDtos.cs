using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Inventories;

public static class StockTransactionTypes
{
    public const string Import = "Import";
    public const string Export = "Export";
    public const string Count = "Count";
    public const string Adjust = "Adjust";
}

public sealed record CreateStockTransactionRequest
{
    [Required]
    public Guid WarehouseId { get; init; }

    [Required, MaxLength(30)]
    public required string TransactionType { get; init; }

    [MaxLength(30)]
    public string? ReferenceType { get; init; }

    public Guid? ReferenceId { get; init; }

    [MaxLength(2000)]
    public string? Notes { get; init; }

    [Required, MinLength(1)]
    public required IReadOnlyCollection<CreateStockTransactionLineRequest> Lines { get; init; }
}

public sealed record CreateStockTransactionLineRequest
{
    [Required]
    public Guid ProductId { get; init; }

    [Range(typeof(decimal), "0.001", "999999999999999.999", ParseLimitsInInvariantCulture = true)]
    public decimal? Quantity { get; init; }

    [Range(typeof(decimal), "-999999999999999.999", "999999999999999.999", ParseLimitsInInvariantCulture = true)]
    public decimal? Adjustment { get; init; }

    [Range(typeof(decimal), "0", "999999999999999.999", ParseLimitsInInvariantCulture = true)]
    public decimal? CountedQuantity { get; init; }
}

public sealed record StockTransactionQuery : IValidatableObject
{
    public string? TransactionType { get; init; }
    public Guid? ProductId { get; init; }
    public Guid? WarehouseId { get; init; }
    public string? ReferenceType { get; init; }
    public Guid? ReferenceId { get; init; }
    public DateTimeOffset? FromDate { get; init; }
    public DateTimeOffset? ToDate { get; init; }

    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 20;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (FromDate.HasValue && ToDate.HasValue && FromDate.Value > ToDate.Value)
        {
            yield return new ValidationResult(
                "FromDate phải nhỏ hơn hoặc bằng ToDate.",
                [nameof(FromDate), nameof(ToDate)]);
        }

        if (!string.IsNullOrWhiteSpace(TransactionType) &&
            !IsSupportedTransactionType(TransactionType.Trim()))
        {
            yield return new ValidationResult(
                "TransactionType phải là Import, Export, Count hoặc Adjust.",
                [nameof(TransactionType)]);
        }
    }

    private static bool IsSupportedTransactionType(string transactionType) =>
        string.Equals(transactionType, StockTransactionTypes.Import, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(transactionType, StockTransactionTypes.Export, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(transactionType, StockTransactionTypes.Count, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(transactionType, StockTransactionTypes.Adjust, StringComparison.OrdinalIgnoreCase);
}

public sealed record StockTransactionResponse(
    Guid Id,
    Guid BatchId,
    Guid WarehouseId,
    string WarehouseName,
    string TransactionType,
    string? ReferenceType,
    Guid? ReferenceId,
    string? Notes,
    Guid? CreatedBy,
    DateTimeOffset CreatedAt,
    IReadOnlyCollection<StockTransactionLineResponse> Lines);

public sealed record StockTransactionLineResponse(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal Quantity,
    decimal? QuantityBefore,
    decimal? QuantityAfter,
    decimal? CountedQuantity);

public sealed record StockTransactionListResponse(
    IReadOnlyCollection<StockTransactionResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);