using AgriStore.Api.DTOs.Warehouses;

namespace AgriStore.Api.Services;

public interface IWarehouseService
{
    Task<IEnumerable<WarehouseResponse>> GetAllAsync();
    Task<WarehouseResponse?> GetByIdAsync(Guid id);
    Task<WarehouseResponse> CreateAsync(CreateWarehouseRequest request);
    Task<bool> UpdateAsync(Guid id, UpdateWarehouseRequest request);
    Task<bool> DeleteAsync(Guid id);
}