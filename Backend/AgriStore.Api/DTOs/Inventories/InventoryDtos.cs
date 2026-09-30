using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Inventories;

/// <summary>Filters and paging options for inventory lookup.</summary>
public sealed record InventoryListQuery
{
    public Guid? ProductId { get; init; }
    public Guid? WarehouseId { get; init; }

    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 20;
}

/// <summary>Filters and paging options for low-stock inventory lookup.</summary>
public sealed record LowStockQuery
{
    public Guid? WarehouseId { get; init; }

    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 20;
}

/// <summary>Inventory quantity and product and warehouse details.</summary>
public sealed record InventoryItemResponse(
    Guid ProductId,
    string ProductCode,
    string ProductName,
    Guid WarehouseId,
    string WarehouseName,
    decimal Quantity,
    decimal ReservedQuantity,
    decimal AvailableQuantity,
    decimal MinStockAlert,
    bool IsLowStock);

/// <summary>A paged collection of inventory items.</summary>
public sealed record InventoryListResponse(
    IReadOnlyCollection<InventoryItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);