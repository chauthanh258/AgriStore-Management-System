using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Warehouses;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public class WarehouseService(ApplicationDbContext context) : IWarehouseService
{
    public async Task<IEnumerable<WarehouseResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await context.Warehouses
            .AsNoTracking()
            .Select(warehouse => new WarehouseResponse
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                Address = warehouse.Address,
                Phone = warehouse.Phone,
                IsDefault = warehouse.IsDefault,
                IsActive = warehouse.IsActive
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<WarehouseResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var warehouse = await context.Warehouses
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return warehouse is null ? null : MapWarehouse(warehouse);
    }

    public async Task<WarehouseServiceResult<WarehouseResponse>> CreateAsync(
        CreateWarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var name = NormalizeName(request.Name);
        if (name is null)
        {
            return WarehouseServiceResult<WarehouseResponse>.Failure(
                StatusCodes.Status400BadRequest,
                "Tên kho không được để trống.");
        }

        if (await IsNameInUseAsync(name, null, cancellationToken))
        {
            return WarehouseServiceResult<WarehouseResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Tên kho đã tồn tại.");
        }

        if (request.IsDefault)
        {
            var defaultWarehouses = await context.Warehouses
                .Where(warehouse => warehouse.IsDefault)
                .ToListAsync(cancellationToken);
            foreach (var item in defaultWarehouses)
            {
                item.IsDefault = false;
            }
        }

        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = name,
            Address = NormalizeOptional(request.Address),
            Phone = NormalizeOptional(request.Phone),
            IsDefault = request.IsDefault,
            IsActive = true
        };

        context.Warehouses.Add(warehouse);
        await context.SaveChangesAsync(cancellationToken);

        return WarehouseServiceResult<WarehouseResponse>.Created(MapWarehouse(warehouse));
    }

    public async Task<WarehouseServiceResult<bool>> UpdateAsync(
        Guid id,
        UpdateWarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var name = NormalizeName(request.Name);
        if (name is null)
        {
            return WarehouseServiceResult<bool>.Failure(
                StatusCodes.Status400BadRequest,
                "Tên kho không được để trống.");
        }

        var warehouse = await context.Warehouses
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (warehouse is null)
        {
            return WarehouseServiceResult<bool>.Failure(
                StatusCodes.Status404NotFound,
                "Không tìm thấy kho hàng để cập nhật.");
        }

        if (await IsNameInUseAsync(name, id, cancellationToken))
        {
            return WarehouseServiceResult<bool>.Failure(
                StatusCodes.Status409Conflict,
                "Tên kho đã được sử dụng bởi kho khác.");
        }

        if (request.IsDefault && !warehouse.IsDefault)
        {
            var defaultWarehouses = await context.Warehouses
                .Where(item => item.IsDefault && item.Id != id)
                .ToListAsync(cancellationToken);
            foreach (var item in defaultWarehouses)
            {
                item.IsDefault = false;
            }
        }

        warehouse.Name = name;
        warehouse.Address = NormalizeOptional(request.Address);
        warehouse.Phone = NormalizeOptional(request.Phone);
        warehouse.IsDefault = request.IsDefault;
        warehouse.IsActive = request.IsActive;

        await context.SaveChangesAsync(cancellationToken);
        return WarehouseServiceResult<bool>.Success(true);
    }

    public async Task<WarehouseServiceResult<bool>> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var warehouse = await context.Warehouses
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (warehouse is null)
        {
            return WarehouseServiceResult<bool>.Failure(
                StatusCodes.Status404NotFound,
                "Không tìm thấy kho hàng để xóa.");
        }

        var isReferenced =
            await context.Inventories.AnyAsync(item => item.WarehouseId == id, cancellationToken) ||
            await context.StockTransactions.AnyAsync(item => item.WarehouseId == id, cancellationToken) ||
            await context.PurchaseOrders.AnyAsync(item => item.WarehouseId == id, cancellationToken) ||
            await context.Orders.AnyAsync(item => item.WarehouseId == id, cancellationToken);

        if (isReferenced)
        {
            return WarehouseServiceResult<bool>.Failure(
                StatusCodes.Status409Conflict,
                "Không thể xóa kho đang được tồn kho, giao dịch hoặc đơn hàng tham chiếu.");
        }

        context.Warehouses.Remove(warehouse);
        await context.SaveChangesAsync(cancellationToken);
        return WarehouseServiceResult<bool>.Success(true);
    }

    private Task<bool> IsNameInUseAsync(
        string name,
        Guid? excludedWarehouseId,
        CancellationToken cancellationToken) =>
        context.Warehouses.AnyAsync(
            warehouse => warehouse.Name == name &&
                         (!excludedWarehouseId.HasValue || warehouse.Id != excludedWarehouseId.Value),
            cancellationToken);

    private static string? NormalizeName(string? name)
    {
        var normalized = name?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static WarehouseResponse MapWarehouse(Warehouse warehouse) => new()
    {
        Id = warehouse.Id,
        Name = warehouse.Name,
        Address = warehouse.Address,
        Phone = warehouse.Phone,
        IsDefault = warehouse.IsDefault,
        IsActive = warehouse.IsActive
    };
}