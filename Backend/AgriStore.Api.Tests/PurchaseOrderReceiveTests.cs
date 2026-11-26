using System.Net;
using System.Net.Http.Json;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.PurchaseOrders;
using Microsoft.Extensions.DependencyInjection;

namespace AgriStore.Api.Tests;

/// <summary>
/// Kiểm thử tích hợp toàn bộ luồng nhận hàng và cập nhật tồn kho.
/// Tuần 9 — Nhiệm vụ: "Kiểm thử các tình huống: nhận thiếu, hủy đơn, cập nhật tồn".
/// </summary>
public sealed class PurchaseOrderReceiveTests
{
    // ------------------------------------------------------------------ seed & helpers

    private static async Task<PoReceiveSeed> SeedAsync(ApiTestFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Code = $"SUP-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Name = "NCC nhận hàng",
            IsActive = true
        };
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Kho nhận hàng",
            IsActive = true
        };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = $"PRD-{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
            Name = "Sản phẩm nhận",
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
            Name = "Sản phẩm nhận 2",
            CategoryId = Guid.NewGuid(),
            UnitId = Guid.NewGuid(),
            SellingPrice = 40_000m,
            CostPrice = 20_000m,
            IsActive = true
        };

        db.Suppliers.Add(supplier);
        db.Warehouses.Add(warehouse);
        db.Products.AddRange(product, product2);
        await db.SaveChangesAsync();

        return new PoReceiveSeed(supplier.Id, warehouse.Id, product.Id, product2.Id);
    }

    /// <summary>Tạo PO Draft rồi chuyển sang Ordered, trả về Id để receive.</summary>
    private static async Task<PurchaseOrderResponse> CreateOrderedPoAsync(
        HttpClient client,
        PoReceiveSeed seed,
        decimal orderedQty = 20)
    {
        var createReq = new PurchaseOrderRequest
        {
            SupplierId = seed.SupplierId,
            WarehouseId = seed.WarehouseId,
            OrderDate = DateTimeOffset.UtcNow,
            Details = [new PurchaseOrderLineRequest
            {
                ProductId = seed.ProductId,
                Quantity = orderedQty,
                UnitPrice = 30_000m
            }]
        };
        var createRes = await client.PostAsJsonAsync("/api/purchase-orders", createReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var po = await createRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(po);

        var orderRes = await client.PostAsync($"/api/purchase-orders/{po.Id}/order", null);
        Assert.Equal(HttpStatusCode.OK, orderRes.StatusCode);
        var ordered = await orderRes.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(ordered);
        Assert.Equal("Ordered", ordered.Status);
        return ordered;
    }

    private static ReceivePurchaseOrderRequest MakeReceiveRequest(Guid productId, decimal qty) =>
        new() { Details = [new ReceivePurchaseOrderLineRequest { ProductId = productId, ReceivedQuantity = qty }] };

    // ------------------------------------------------------------------ tests

    /// <summary>
    /// Nhận thiếu (partial receive): tồn kho tăng đúng số đã nhận, trạng thái PO vẫn "Ordered".
    /// </summary>
    [Fact]
    public async Task ReceivePartial_IncreasesStockByReceivedQty_StatusRemainsOrdered()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        var po = await CreateOrderedPoAsync(client, seed, orderedQty: 20);
        var stockBefore = await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId);
        Assert.Equal(0m, stockBefore); // chưa nhận lần nào

        // Nhận 7 trên 20 đặt
        var response = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 7));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var received = await response.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(received);

        // Trạng thái vẫn Ordered (chưa nhận đủ)
        Assert.Equal("Ordered", received.Status);

        // ReceivedQuantity trên detail = 7
        var detail = received.Details.Single(d => d.ProductId == seed.ProductId);
        Assert.Equal(7m, detail.ReceivedQuantity);

        // Tồn kho trong DB = 7
        var stockAfter = await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId);
        Assert.Equal(7m, stockAfter);
    }

    /// <summary>
    /// Nhận đủ (full receive): tồn kho tăng đúng, trạng thái PO chuyển sang "Received".
    /// </summary>
    [Fact]
    public async Task ReceiveFull_IncreasesStockCorrectly_StatusBecomesReceived()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        var po = await CreateOrderedPoAsync(client, seed, orderedQty: 15);

        var response = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 15)); // nhận đúng 15

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var received = await response.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(received);

        // Trạng thái phải chuyển sang Received
        Assert.Equal("Received", received.Status);

        // Tồn kho = 15
        Assert.Equal(15m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));
    }

    /// <summary>
    /// Nhận vượt số lượng đặt → 409 Conflict, tồn kho không thay đổi.
    /// </summary>
    [Fact]
    public async Task Receive_ReturnsConflict_WhenExceedsOrderedQuantity()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        var po = await CreateOrderedPoAsync(client, seed, orderedQty: 10);

        // Cố nhận 11 (vượt 1 đơn vị)
        var response = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 11));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        // Tồn kho vẫn = 0
        Assert.Equal(0m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));
    }

    /// <summary>
    /// Nhận hàng từ đơn đã Received (nhận đủ rồi nhận tiếp) → 409 Conflict.
    /// </summary>
    [Fact]
    public async Task Receive_ReturnsConflict_WhenOrderAlreadyFullyReceived()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        var po = await CreateOrderedPoAsync(client, seed, orderedQty: 5);

        // Nhận đủ lần 1 → status = Received
        var firstReceive = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 5));
        Assert.Equal(HttpStatusCode.OK, firstReceive.StatusCode);
        var fullyReceived = await firstReceive.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(fullyReceived);
        Assert.Equal("Received", fullyReceived.Status);

        // Nhận tiếp lần 2 → phải bị từ chối
        var secondReceive = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 1));

        Assert.Equal(HttpStatusCode.Conflict, secondReceive.StatusCode);

        // Tồn kho vẫn = 5 (không thay đổi)
        Assert.Equal(5m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));
    }

    /// <summary>
    /// Nhận hàng từ đơn đã Cancelled (seed trực tiếp vào DB) → 409 Conflict.
    /// </summary>
    [Fact]
    public async Task Receive_ReturnsConflict_WhenOrderIsCancelled()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        // Seed trực tiếp một PO ở trạng thái Cancelled vào DB
        Guid cancelledPoId;
        Guid detailProductId = seed.ProductId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AgriStore.Api.Data.ApplicationDbContext>();
            var po = new AgriStore.Api.Domain.Entities.PurchaseOrder
            {
                Id = Guid.NewGuid(),
                Code = "PO-CANCELLED-TEST",
                SupplierId = seed.SupplierId,
                WarehouseId = seed.WarehouseId,
                OrderDate = DateTime.UtcNow,
                Status = "Cancelled",
                TotalAmount = 300_000m
            };
            var detail = new AgriStore.Api.Domain.Entities.PurchaseOrderDetail
            {
                Id = Guid.NewGuid(),
                PurchaseOrderId = po.Id,
                ProductId = seed.ProductId,
                Quantity = 10,
                UnitPrice = 30_000m,
                TotalPrice = 300_000m,
                ReceivedQuantity = 0
            };
            db.PurchaseOrders.Add(po);
            db.PurchaseOrderDetails.Add(detail);
            await db.SaveChangesAsync();
            cancelledPoId = po.Id;
        }

        var response = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{cancelledPoId}/receive",
            MakeReceiveRequest(detailProductId, 5));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        // Tồn kho = 0 (không có gì được nhập)
        Assert.Equal(0m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));
    }

    /// <summary>
    /// Nhận hàng với 2 dòng cùng ProductId → 400 Bad Request (trùng sản phẩm).
    /// </summary>
    [Fact]
    public async Task Receive_ReturnsBadRequest_WhenDuplicateProductInRequest()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        var po = await CreateOrderedPoAsync(client, seed, orderedQty: 20);

        // Gửi 2 dòng cùng ProductId
        var request = new ReceivePurchaseOrderRequest
        {
            Details =
            [
                new ReceivePurchaseOrderLineRequest { ProductId = seed.ProductId, ReceivedQuantity = 5 },
                new ReceivePurchaseOrderLineRequest { ProductId = seed.ProductId, ReceivedQuantity = 3 }
            ]
        };

        var response = await client.PostAsJsonAsync($"/api/purchase-orders/{po.Id}/receive", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // Tồn kho vẫn = 0
        Assert.Equal(0m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));
    }

    /// <summary>
    /// Nhận đủ hàng → StockTransaction loại Import được tạo trong DB với số lượng và kho đúng.
    /// </summary>
    [Fact]
    public async Task ReceiveFull_CreatesImportStockTransaction_InDatabase()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        // Trước khi nhận: chưa có transaction nào
        Assert.Equal(0, await factory.CountImportTransactionsAsync(seed.ProductId, seed.WarehouseId));

        var po = await CreateOrderedPoAsync(client, seed, orderedQty: 12);

        var response = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 12));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Sau khi nhận: đúng 1 StockTransaction Import được tạo
        Assert.Equal(1, await factory.CountImportTransactionsAsync(seed.ProductId, seed.WarehouseId));

        // Tồn kho cũng phải đúng
        Assert.Equal(12m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));
    }

    /// <summary>
    /// Nhận thiếu 2 lần liên tiếp → tồn kho tích lũy đúng, StockTransaction Import = 2 bản ghi.
    /// </summary>
    [Fact]
    public async Task ReceiveTwicePartial_AccumulatesStockAndTransactions()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var seed = await SeedAsync(factory);

        var po = await CreateOrderedPoAsync(client, seed, orderedQty: 30);

        // Lần 1: nhận 10
        var r1 = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 10));
        Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        Assert.Equal(10m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));
        Assert.Equal(1, await factory.CountImportTransactionsAsync(seed.ProductId, seed.WarehouseId));

        // Lần 2: nhận thêm 20 (đủ 30) → Received
        var r2 = await client.PostAsJsonAsync(
            $"/api/purchase-orders/{po.Id}/receive",
            MakeReceiveRequest(seed.ProductId, 20));
        Assert.Equal(HttpStatusCode.OK, r2.StatusCode);
        var final = await r2.Content.ReadFromJsonAsync<PurchaseOrderResponse>();
        Assert.NotNull(final);
        Assert.Equal("Received", final.Status);

        // Tồn kho = 10 + 20 = 30
        Assert.Equal(30m, await factory.GetInventoryQuantityAsync(seed.ProductId, seed.WarehouseId));

        // 2 giao dịch Import
        Assert.Equal(2, await factory.CountImportTransactionsAsync(seed.ProductId, seed.WarehouseId));
    }
}

public sealed record PoReceiveSeed(
    Guid SupplierId,
    Guid WarehouseId,
    Guid ProductId,
    Guid ProductId2);
