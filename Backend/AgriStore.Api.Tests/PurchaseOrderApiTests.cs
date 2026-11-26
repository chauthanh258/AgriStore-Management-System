using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.PurchaseOrders;
using AgriStore.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Tests;

public sealed class PurchaseOrderApiTests
{
    [Fact]
    public async Task GetPagedAsync_FiltersByStatusAndPaginatesResults()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"purchase-order-test-{Guid.NewGuid():N}")
            .Options;
        await using var dbContext = new ApplicationDbContext(options);
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Code = "SUP-TEST",
            Name = "Nhà cung cấp kiểm thử",
            IsActive = true
        };
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Kho kiểm thử",
            IsActive = true
        };

        dbContext.Suppliers.Add(supplier);
        dbContext.Warehouses.Add(warehouse);
        dbContext.PurchaseOrders.AddRange(
            CreateOrder(supplier.Id, warehouse.Id, "PO-ORDERED-1", "Ordered", new DateTime(2026, 11, 20)),
            CreateOrder(supplier.Id, warehouse.Id, "PO-ORDERED-2", "Ordered", new DateTime(2026, 11, 21)),
            CreateOrder(supplier.Id, warehouse.Id, "PO-DRAFT-1", "Draft", new DateTime(2026, 11, 22)));
        await dbContext.SaveChangesAsync();

        var service = new PurchaseOrderService(dbContext);
        var result = await service.GetPagedAsync(
            new PurchaseOrderListQuery(Page: 1, PageSize: 1, Status: "Ordered"),
            CancellationToken.None);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.Equal(1, result.Page);
        Assert.Equal(1, result.PageSize);
        var item = Assert.Single(result.Items);
        Assert.Equal("PO-ORDERED-2", item.Code);
        Assert.Equal("Nhà cung cấp kiểm thử", item.SupplierName);
        Assert.Equal("Kho kiểm thử", item.WarehouseName);
        Assert.Equal("Ordered", item.Status);
    }

    private static PurchaseOrder CreateOrder(
        Guid supplierId,
        Guid warehouseId,
        string code,
        string status,
        DateTime orderDate)
    {
        return new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            Code = code,
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            OrderDate = orderDate,
            Status = status,
            TotalAmount = 100m
        };
    }
}
