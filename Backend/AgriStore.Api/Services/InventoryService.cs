using AgriStore.Api.Data;
using AgriStore.Api.DTOs.Inventories;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class InventoryService(ApplicationDbContext context) : IInventoryService
{
    public Task<InventoryListResponse> GetInventoriesAsync(
        InventoryListQuery query,
        CancellationToken cancellationToken)
    {
        var inventoryQuery = BuildInventoryQuery(
            query.ProductId,
            query.WarehouseId,
            lowStockOnly: false);

        return GetPagedAsync(inventoryQuery, query.Page, query.PageSize, cancellationToken);
    }

    public Task<InventoryListResponse> GetLowStockAsync(
        LowStockQuery query,
        CancellationToken cancellationToken)
    {
        var inventoryQuery = BuildInventoryQuery(
            productId: null,
            query.WarehouseId,
            lowStockOnly: true);

        return GetPagedAsync(inventoryQuery, query.Page, query.PageSize, cancellationToken);
    }

    private IQueryable<InventoryItemResponse> BuildInventoryQuery(
        Guid? productId,
        Guid? warehouseId,
        bool lowStockOnly)
    {
        var query =
            from inventory in context.Inventories.AsNoTracking()
            join product in context.Products.AsNoTracking()
                on inventory.ProductId equals product.Id
            join warehouse in context.Warehouses.AsNoTracking()
                on inventory.WarehouseId equals warehouse.Id
            where (!productId.HasValue || inventory.ProductId == productId.Value)
                && (!warehouseId.HasValue || inventory.WarehouseId == warehouseId.Value)
                && (!lowStockOnly || inventory.Quantity - inventory.ReservedQuantity <= product.MinStockAlert)
            orderby product.Name, warehouse.Name, product.Id, warehouse.Id
            select new InventoryItemResponse(
                product.Id,
                product.Code,
                product.Name,
                warehouse.Id,
                warehouse.Name,
                inventory.Quantity,
                inventory.ReservedQuantity,
                inventory.Quantity - inventory.ReservedQuantity,
                product.MinStockAlert,
                inventory.Quantity - inventory.ReservedQuantity <= product.MinStockAlert);

        return query;
    }

    private static async Task<InventoryListResponse> GetPagedAsync(
        IQueryable<InventoryItemResponse> query,
        int requestedPage,
        int requestedPageSize,
        CancellationToken cancellationToken)
    {
        var page = requestedPage;
        var pageSize = requestedPageSize;
        var totalCount = await query.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var skip = (int)Math.Min((long)(page - 1) * pageSize, int.MaxValue);

        var items = await query
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new InventoryListResponse(items, page, pageSize, totalCount, totalPages);
    }
}