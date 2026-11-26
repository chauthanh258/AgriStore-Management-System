using System.Net;
using System.Net.Http.Json;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.PurchaseOrders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriStore.Api.Tests;

/// <summary>
/// Kiểm thử tích hợp toàn bộ luồng CRUD của Đơn nhập hàng (/api/purchase-orders).
/// Tuần 9 — Nhiệm vụ: "Viết test API Nhà cung cấp và Đơn nhập hàng".
/// </summary>
public sealed class PurchaseOrderCrudTests
{
    // ------------------------------------------------------------------ seed helpers

    /// <summary>Seed Supplier + Warehouse + Product vào InMemory DB, trả về các Id cần thiết.</summary>
    private static async Task<PoSeed> SeedPoPrerequisitesAsync(ApiTestFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Code = $"SUP-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Name = "Nhà cung cấp kiểm thử PO",
            IsActive = true
        };
        var inactiveSupplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Code = $"SUP-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Name = "NCC ngừng hoạt động",
            IsActive = false
        };
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Kho kiểm thử PO",
            IsActive = true
        };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = $"PRD-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Name = "Rau kiểm thử",
            CategoryId = Guid.NewGuid(),
            UnitId = Guid.NewGuid(),
            SellingPrice = 50_000m,
            CostPrice = 30_000m,
            IsActive = true
        };
        var product2 = new Product
        {
            Id = Guid.NewGuid(),
            Code = $"PRD-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Name = "Củ kiểm thử",
            CategoryId = Guid.NewGuid(),
            UnitId = Guid.NewGuid(),
            SellingPrice = 40_000m,
            CostPrice = 25_000m,
            IsActive = true
        };

        db.Suppliers.AddRange(supplier, inactiveSupplier);
        db.Warehouses.Add(warehouse);
        db.Products.AddRange(product, product2);
        await db.SaveChangesAsync();

        return new PoSeed(supplier.Id, inactiveSupplier.Id, warehouse.Id, product.Id, product2.Id);
    }

    /// <summary>Tạo PO Draft qua API rồi trả về response.</summary>
    private static async Task<PurchaseOrderResponse> CreateDraftPoAsync(
        HttpClient client,
        PoSeed seed,
        decimal quantity = 10,
        decimal unitPrice = 30_000)
    {
        var request = new PurchaseOrderRequest
        {
            SupplierId = seed.SupplierId,
            WarehouseId = seed.WarehouseId,
            OrderDate = DateTimeOffset.UtcNow,
            Details = [new PurchaseOrderLineRequest
            {
                ProductId = seed.ProductId,
                Quantity = quantity,
                UnitPrice = unitPrice
            }]
        };
        var response = await client.PostAsJsonAsync("/api/purchase-orders", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(body);
        return body;
    }

    // ------------------------------------------------------------------ tests

    /// <summary>
    /// POST /api/purchase-orders — tạo đơn hợp lệ → 201 Created, trạng thái "Draft".
    /// </summary>
    [Fact]
    public async Task CreatePurchaseOrder_ReturnsDraft_WhenValidRequest()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        var po = await CreateDraftPoAsync(client, seed, quantity: 20, unitPrice: 30_000);

        Assert.NotEqual(Guid.Empty, po.Id);
        Assert.Equal("Draft", po.Status);
        Assert.Equal("Nhà cung cấp kiểm thử PO", po.SupplierName);
        Assert.Equal("Kho kiểm thử PO", po.WarehouseName);
        Assert.Equal(600_000m, po.TotalAmount);  // 20 * 30_000
        Assert.Single(po.Details);
        Assert.Equal(seed.ProductId, po.Details.First().ProductId);
    }

    /// <summary>
    /// POST /api/purchase-orders — NCC ngừng hoạt động → 400 Bad Request.
    /// </summary>
    [Fact]
    public async Task CreatePurchaseOrder_ReturnsBadRequest_WhenSupplierIsInactive()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        var request = new PurchaseOrderRequest
        {
            SupplierId = seed.InactiveSupplierId,
            WarehouseId = seed.WarehouseId,
            OrderDate = DateTimeOffset.UtcNow,
            Details = [new PurchaseOrderLineRequest
            {
                ProductId = seed.ProductId,
                Quantity = 5,
                UnitPrice = 30_000
            }]
        };

        var response = await client.PostAsJsonAsync("/api/purchase-orders", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// POST /api/purchase-orders — không có dòng sản phẩm nào → 400 Bad Request.
    /// </summary>
    [Fact]
    public async Task CreatePurchaseOrder_ReturnsBadRequest_WhenNoDetails()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        var request = new PurchaseOrderRequest
        {
            SupplierId = seed.SupplierId,
            WarehouseId = seed.WarehouseId,
            OrderDate = DateTimeOffset.UtcNow,
            Details = []
        };

        var response = await client.PostAsJsonAsync("/api/purchase-orders", request);

        // MinLength(1) trên Details → model binding trả 400
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// GET /api/purchase-orders/{id} — id không tồn tại → 404 Not Found.
    /// </summary>
    [Fact]
    public async Task GetPurchaseOrderById_ReturnsNotFound_WhenMissing()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/purchase-orders/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// PUT /api/purchase-orders/{id} — cập nhật đơn không ở trạng thái Draft → 409 Conflict.
    /// </summary>
    [Fact]
    public async Task UpdatePurchaseOrder_ReturnsConflict_WhenStatusIsNotDraft()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        var po = await CreateDraftPoAsync(client, seed);

        // Chuyển sang Ordered
        var orderResponse = await client.PostAsync($"/api/purchase-orders/{po.Id}/order", null);
        Assert.Equal(HttpStatusCode.OK, orderResponse.StatusCode);

        // Cố sửa đơn đã Ordered → phải bị từ chối
        var updateRequest = new PurchaseOrderRequest
        {
            SupplierId = seed.SupplierId,
            WarehouseId = seed.WarehouseId,
            OrderDate = DateTimeOffset.UtcNow,
            Details = [new PurchaseOrderLineRequest
            {
                ProductId = seed.ProductId,
                Quantity = 99,
                UnitPrice = 1_000
            }]
        };
        var updateResponse = await client.PutAsJsonAsync($"/api/purchase-orders/{po.Id}", updateRequest);

        Assert.Equal(HttpStatusCode.Conflict, updateResponse.StatusCode);
    }

    /// <summary>
    /// POST /api/purchase-orders/{id}/order — Draft có sản phẩm → chuyển sang "Ordered".
    /// </summary>
    [Fact]
    public async Task MarkOrdered_TransitionsDraftToOrdered()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        var po = await CreateDraftPoAsync(client, seed);
        Assert.Equal("Draft", po.Status);

        var response = await client.PostAsync($"/api/purchase-orders/{po.Id}/order", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var ordered = await response.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(ordered);
        Assert.Equal("Ordered", ordered.Status);
    }

    /// <summary>
    /// POST /api/purchase-orders/{id}/details — thêm sản phẩm đã có → 409 Conflict.
    /// </summary>
    [Fact]
    public async Task AddDetail_ReturnsConflict_WhenProductAlreadyExistsInOrder()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        var po = await CreateDraftPoAsync(client, seed); // đã có seed.ProductId

        // Thêm lại cùng ProductId
        var addRequest = new PurchaseOrderLineRequest
        {
            ProductId = seed.ProductId,
            Quantity = 5,
            UnitPrice = 28_000
        };
        var response = await client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/details", addRequest);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    /// <summary>
    /// DELETE /api/purchase-orders/{id}/details/{detailId} — xóa dòng cuối cùng → 409 Conflict.
    /// </summary>
    [Fact]
    public async Task RemoveDetail_ReturnsConflict_WhenItIsTheLastProduct()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        var po = await CreateDraftPoAsync(client, seed); // 1 dòng duy nhất
        var detailId = po.Details.First().Id;

        var response = await client.DeleteAsync($"/api/purchase-orders/{po.Id}/details/{detailId}");

        // Phải bị chặn: đơn phải có ít nhất 1 sản phẩm
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    /// <summary>
    /// DELETE /api/purchase-orders/{id}/details/{detailId} — xóa 1 dòng khi còn dòng khác → 200 OK, TotalAmount được cập nhật.
    /// </summary>
    [Fact]
    public async Task RemoveDetail_ReturnsOk_WhenOtherDetailsExist()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedPoPrerequisitesAsync(factory);

        // Tạo PO với 2 sản phẩm
        var createRequest = new PurchaseOrderRequest
        {
            SupplierId = seed.SupplierId,
            WarehouseId = seed.WarehouseId,
            OrderDate = DateTimeOffset.UtcNow,
            Details =
            [
                new PurchaseOrderLineRequest { ProductId = seed.ProductId,  Quantity = 10, UnitPrice = 30_000 },
                new PurchaseOrderLineRequest { ProductId = seed.ProductId2, Quantity = 5,  UnitPrice = 20_000 }
            ]
        };
        var createResponse = await client.PostAsJsonAsync("/api/purchase-orders", createRequest);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var po = await createResponse.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po);
        Assert.Equal(2, po.Details.Count);

        // Lấy detailId của sản phẩm thứ 2 (ProductId2)
        var detailToRemove = po.Details.First(d => d.ProductId == seed.ProductId2);

        var deleteResponse = await client.DeleteAsync($"/api/purchase-orders/{po.Id}/details/{detailToRemove.Id}");

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        var updated = await deleteResponse.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(updated);
        Assert.Single(updated.Details);
        Assert.Equal(300_000m, updated.TotalAmount); // chỉ còn 10 * 30_000
    }
}

/// <summary>Dữ liệu seed cho test Purchase Order.</summary>
public sealed record PoSeed(
    Guid SupplierId,
    Guid InactiveSupplierId,
    Guid WarehouseId,
    Guid ProductId,
    Guid ProductId2);
