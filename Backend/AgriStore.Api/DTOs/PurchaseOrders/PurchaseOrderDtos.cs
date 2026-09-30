using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.PurchaseOrders;

public sealed record PurchaseOrderRequest
{
    [Required]
    public Guid SupplierId { get; init; }

    [Required]
    public Guid WarehouseId { get; init; }

    [Required]
    public DateTimeOffset OrderDate { get; init; }

    public DateTimeOffset? ExpectedDate { get; init; }

    [MaxLength(2000)]
    public string? Notes { get; init; }

    [Required, MinLength(1)]
    public required IReadOnlyCollection<PurchaseOrderLineRequest> Details { get; init; }
}

public sealed record PurchaseOrderLineRequest
{
    [Required]
    public Guid ProductId { get; init; }

    [Range(typeof(decimal), "0.001", "999999999999999.999", ParseLimitsInInvariantCulture = true)]
    public decimal Quantity { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal UnitPrice { get; init; }
}

public sealed record PurchaseOrderResponse(
    Guid Id,
    string Code,
    Guid SupplierId,
    string SupplierName,
    Guid WarehouseId,
    string WarehouseName,
    DateTime OrderDate,
    DateTime? ExpectedDate,
    string Status,
    decimal TotalAmount,
    string? Notes,
    IReadOnlyCollection<PurchaseOrderDetailResponse> Details);

public sealed record PurchaseOrderDetailResponse(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    decimal ReceivedQuantity);