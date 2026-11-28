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
            query.Search,
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
            query.Search,
            lowStockOnly: true);

        return GetPagedAsync(inventoryQuery, query.Page, query.PageSize, cancellationToken);
    }

    private IQueryable<InventoryItemResponse> BuildInventoryQuery(
        Guid? productId,
        Guid? warehouseId,
        string? search,
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
            select new { inventory, product, warehouse };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToUpperInvariant();
            query = query.Where(item =>
                item.product.Code.ToUpper().Contains(normalizedSearch) ||
                item.product.Name.ToUpper().Contains(normalizedSearch));
        }

        return query
            .OrderBy(item => item.product.Name)
            .ThenBy(item => item.warehouse.Name)
            .ThenBy(item => item.product.Id)
            .ThenBy(item => item.warehouse.Id)
            .Select(item => new InventoryItemResponse(
                item.product.Id,
                item.product.Code,
                item.product.Name,
                item.warehouse.Id,
                item.warehouse.Name,
                item.inventory.Quantity,
                item.inventory.ReservedQuantity,
                item.inventory.Quantity - item.inventory.ReservedQuantity,
                item.product.MinStockAlert,
                item.inventory.Quantity - item.inventory.ReservedQuantity <= item.product.MinStockAlert));
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