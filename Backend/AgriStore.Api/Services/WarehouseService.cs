using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Warehouses;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public class WarehouseService(ApplicationDbContext context) : IWarehouseService
{
    public async Task<IEnumerable<WarehouseResponse>> GetAllAsync()
    {
        return await context.Warehouses
            .AsNoTracking()
            .Select(w => new WarehouseResponse
            {
                Id = w.Id,
                Name = w.Name,
                Address = w.Address,
                Phone = w.Phone,
                IsDefault = w.IsDefault,
                IsActive = w.IsActive
            })
            .ToListAsync();
    }

    public async Task<WarehouseResponse?> GetByIdAsync(Guid id)
    {
        var warehouse = await context.Warehouses.FindAsync(id);
        if (warehouse == null) return null;

        return new WarehouseResponse
        {
            Id = warehouse.Id,
            Name = warehouse.Name,
            Address = warehouse.Address,
            Phone = warehouse.Phone,
            IsDefault = warehouse.IsDefault,
            IsActive = warehouse.IsActive
        };
    }

    public async Task<WarehouseResponse> CreateAsync(CreateWarehouseRequest request)
    {
        if (request.IsDefault)
        {
            var defaultWarehouses = await context.Warehouses.Where(w => w.IsDefault).ToListAsync();
            foreach (var item in defaultWarehouses)
            {
                item.IsDefault = false;
            }
        }

        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Address = request.Address,
            Phone = request.Phone,
            IsDefault = request.IsDefault,
            IsActive = true
        };

        context.Warehouses.Add(warehouse);
        await context.SaveChangesAsync();

        return new WarehouseResponse
        {
            Id = warehouse.Id,
            Name = warehouse.Name,
            Address = warehouse.Address,
            Phone = warehouse.Phone,
            IsDefault = warehouse.IsDefault,
            IsActive = warehouse.IsActive
        };
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateWarehouseRequest request)
    {
        var warehouse = await context.Warehouses.FindAsync(id);
        if (warehouse == null) return false;

        if (request.IsDefault && !warehouse.IsDefault)
        {
            var defaultWarehouses = await context.Warehouses.Where(w => w.IsDefault && w.Id != id).ToListAsync();
            foreach (var item in defaultWarehouses)
            {
                item.IsDefault = false;
            }
        }

        warehouse.Name = request.Name;
        warehouse.Address = request.Address;
        warehouse.Phone = request.Phone;
        warehouse.IsDefault = request.IsDefault;
        warehouse.IsActive = request.IsActive;

        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var warehouse = await context.Warehouses.FindAsync(id);
        if (warehouse == null) return false;

        context.Warehouses.Remove(warehouse);
        await context.SaveChangesAsync();
        return true;
    }
}