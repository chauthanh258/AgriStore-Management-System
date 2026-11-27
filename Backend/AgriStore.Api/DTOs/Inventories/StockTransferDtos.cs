using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Inventories;

/// <summary>Payload for transferring stock atomically between two warehouses.</summary>
public sealed record CreateStockTransferRequest
{
    /// <summary>Client-generated idempotency key for safe retries.</summary>
    [Required]
    public Guid TransferId { get; init; }

    [Required]
    public Guid SourceWarehouseId { get; init; }

    [Required]
    public Guid DestinationWarehouseId { get; init; }

    [MaxLength(2000)]
    public string? Notes { get; init; }

    [Required, MinLength(1)]
    public required IReadOnlyCollection<CreateStockTransferLineRequest> Lines { get; init; }
}

/// <summary>A product and positive quantity in a stock transfer.</summary>
public sealed record CreateStockTransferLineRequest
{
    [Required]
    public Guid ProductId { get; init; }

    [Range(typeof(decimal), "0.001", "999999999999999.999", ParseLimitsInInvariantCulture = true)]
    public decimal Quantity { get; init; }
}

/// <summary>Paired export and import transactions created by one stock transfer.</summary>
public sealed record StockTransferResponse(
    Guid TransferId,
    StockTransactionResponse OutboundTransaction,
    StockTransactionResponse InboundTransaction);
