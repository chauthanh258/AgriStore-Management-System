using AgriStore.Api.DTOs.Inventories;

namespace AgriStore.Api.Services;

public interface IInventoryService
{
    Task<InventoryListResponse> GetInventoriesAsync(
        InventoryListQuery query,
        CancellationToken cancellationToken);

    Task<InventoryListResponse> GetLowStockAsync(
        LowStockQuery query,
        CancellationToken cancellationToken);
}