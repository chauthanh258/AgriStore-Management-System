using System.Net;
using System.Net.Http.Json;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Inventories;
using AgriStore.Api.DTOs.Warehouses;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriStore.Api.Tests;

public sealed class InventoryWarehouseStockTransactionApiTests
{
    [Fact]
    public async Task WarehouseCrud_ValidatesNamesAndBlocksDeleteWhenReferenced()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync("/api/warehouses", new CreateWarehouseRequest
        {
            Name = "  Kho kiểm thử  ",
            IsDefault = true
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<WarehouseResponse>();
        Assert.NotNull(created);
        Assert.Equal("Kho kiểm thử", created.Name);

        var list = await client.GetFromJsonAsync<List<WarehouseResponse>>("/api/warehouses");
        Assert.NotNull(list);
        Assert.Contains(list, warehouse => warehouse.Id == created.Id);

        var getResponse = await client.GetAsync($"/api/warehouses/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/warehouses/{created.Id}",
            new UpdateWarehouseRequest
            {
                Name = "Kho kiểm thử đã cập nhật",
                Address = "Đà Lạt",
                IsDefault = true,
                IsActive = true
            });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var secondWarehouseResponse = await client.PostAsJsonAsync(
            "/api/warehouses",
            new CreateWarehouseRequest { Name = "Kho phụ" });
        Assert.Equal(HttpStatusCode.Created, secondWarehouseResponse.StatusCode);
        var secondWarehouse = await secondWarehouseResponse.Content.ReadFromJsonAsync<WarehouseResponse>();
        Assert.NotNull(secondWarehouse);

        var duplicateResponse = await client.PostAsJsonAsync(
            "/api/warehouses",
            new CreateWarehouseRequest { Name = " Kho kiểm thử đã cập nhật " });
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        var blankNameResponse = await client.PostAsJsonAsync(
            "/api/warehouses",
            new CreateWarehouseRequest { Name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, blankNameResponse.StatusCode);

        await SeedInventoryAsync(factory, created.Id, 4m, reservedQuantity: 0m);
        var blockedDeleteResponse = await client.DeleteAsync($"/api/warehouses/{created.Id}");
        Assert.Equal(HttpStatusCode.Conflict, blockedDeleteResponse.StatusCode);

        var deleteUnusedResponse = await client.DeleteAsync($"/api/warehouses/{secondWarehouse.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteUnusedResponse.StatusCode);

        var missingResponse = await client.GetAsync($"/api/warehouses/{secondWarehouse.Id}");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    [Fact]
    public async Task InventoryEndpoints_FilterAndReportAvailableLowStockQuantity()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var warehouse = await CreateWarehouseAsync(client, "Kho tồn thấp");
        var lowStock = await SeedInventoryAsync(
            factory,
            warehouse.Id,
            quantity: 4m,
            reservedQuantity: 1m,
            minStockAlert: 4m);
        await SeedInventoryAsync(
            factory,
            warehouse.Id,
            quantity: 10m,
            reservedQuantity: 0m,
            minStockAlert: 2m);

        var filtered = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories?productId={lowStock.ProductId}&warehouseId={warehouse.Id}&page=1&pageSize=10");
        Assert.NotNull(filtered);
        var item = Assert.Single(filtered.Items);
        Assert.Equal(4m, item.Quantity);
        Assert.Equal(1m, item.ReservedQuantity);
        Assert.Equal(3m, item.AvailableQuantity);
        Assert.True(item.IsLowStock);

        var firstPage = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories?warehouseId={warehouse.Id}&page=1&pageSize=1");
        Assert.NotNull(firstPage);
        Assert.Equal(2, firstPage.TotalCount);
        Assert.Equal(2, firstPage.TotalPages);
        Assert.Single(firstPage.Items);

        var lowStockResponse = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories/low-stock?warehouseId={warehouse.Id}");
        Assert.NotNull(lowStockResponse);
        Assert.Equal(1, lowStockResponse.TotalCount);
        Assert.Equal(lowStock.ProductId, Assert.Single(lowStockResponse.Items).ProductId);
    }

    [Fact]
    public async Task InventoryEndpoints_SearchByProductCodeOrName_IsCaseInsensitiveAndWorksWithLowStock()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var warehouse = await CreateWarehouseAsync(client, "Kho tìm kiếm");
        var matching = await SeedInventoryAsync(
            factory,
            warehouse.Id,
            quantity: 3m,
            minStockAlert: 3m,
            productCode: "AGRI-KALE-01",
            productName: "Rau Kale hữu cơ");
        await SeedInventoryAsync(
            factory,
            warehouse.Id,
            quantity: 20m,
            productCode: "AGRI-CARROT-02",
            productName: "Cà rốt Đà Lạt");

        var codeSearch = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories?warehouseId={warehouse.Id}&search=kale-01");
        Assert.NotNull(codeSearch);
        Assert.Equal(matching.ProductId, Assert.Single(codeSearch.Items).ProductId);

        var nameSearch = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories?warehouseId={warehouse.Id}&search=%20KALE%20");
        Assert.NotNull(nameSearch);
        Assert.Equal(matching.ProductId, Assert.Single(nameSearch.Items).ProductId);

        var lowStockSearch = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories/low-stock?warehouseId={warehouse.Id}&search=rau%20kale");
        Assert.NotNull(lowStockSearch);
        Assert.Equal(matching.ProductId, Assert.Single(lowStockSearch.Items).ProductId);

        var noMatch = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories?warehouseId={warehouse.Id}&search=not-found");
        Assert.NotNull(noMatch);
        Assert.Empty(noMatch.Items);
        Assert.Equal(0, noMatch.TotalCount);
    }

    [Fact]
    public async Task ExportThatWouldReduceStockBelowReservedQuantity_ReturnsConflictWithoutPartialChanges()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var warehouse = await CreateWarehouseAsync(client, "Kho kiểm thử tồn");
        var first = await SeedInventoryAsync(factory, warehouse.Id, quantity: 10m);
        var second = await SeedInventoryAsync(
            factory,
            warehouse.Id,
            quantity: 5m,
            reservedQuantity: 2m);

        var response = await client.PostAsJsonAsync(
            "/api/stock-transactions",
            new CreateStockTransactionRequest
            {
                WarehouseId = warehouse.Id,
                TransactionType = StockTransactionTypes.Export,
                Notes = "Xuất nhiều sản phẩm",
                Lines =
                [
                    new CreateStockTransactionLineRequest
                    {
                        ProductId = first.ProductId,
                        Quantity = 1m
                    },
                    new CreateStockTransactionLineRequest
                    {
                        ProductId = second.ProductId,
                        Quantity = 4m
                    }
                ]
            });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(10m, await GetInventoryQuantityAsync(factory, first.ProductId, warehouse.Id));
        Assert.Equal(5m, await GetInventoryQuantityAsync(factory, second.ProductId, warehouse.Id));
        Assert.Equal(0, await CountTransactionsAsync(factory));
    }

    [Fact]
    public async Task AdjustmentRequiresReasonAndCanIncreaseOrDecreaseStockWithinReservedQuantity()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var warehouse = await CreateWarehouseAsync(client, "Kho điều chỉnh");
        var inventory = await SeedInventoryAsync(
            factory,
            warehouse.Id,
            quantity: 8m,
            reservedQuantity: 2m);

        var missingReason = await client.PostAsJsonAsync(
            "/api/stock-transactions",
            CreateAdjustment(warehouse.Id, inventory.ProductId, -1m, notes: null));
        Assert.Equal(HttpStatusCode.BadRequest, missingReason.StatusCode);

        var decrease = await client.PostAsJsonAsync(
            "/api/stock-transactions",
            CreateAdjustment(warehouse.Id, inventory.ProductId, -3m, "Hàng hư hỏng"));
        Assert.Equal(HttpStatusCode.Created, decrease.StatusCode);
        Assert.Equal(5m, await GetInventoryQuantityAsync(factory, inventory.ProductId, warehouse.Id));

        var increase = await client.PostAsJsonAsync(
            "/api/stock-transactions",
            CreateAdjustment(warehouse.Id, inventory.ProductId, 2m, "Điều chỉnh kiểm kê"));
        Assert.Equal(HttpStatusCode.Created, increase.StatusCode);
        Assert.Equal(7m, await GetInventoryQuantityAsync(factory, inventory.ProductId, warehouse.Id));

        var belowReserved = await client.PostAsJsonAsync(
            "/api/stock-transactions",
            CreateAdjustment(warehouse.Id, inventory.ProductId, -6m, "Điều chỉnh sai lệch"));
        Assert.Equal(HttpStatusCode.Conflict, belowReserved.StatusCode);
        Assert.Equal(7m, await GetInventoryQuantityAsync(factory, inventory.ProductId, warehouse.Id));
        Assert.Equal(2, await CountTransactionsAsync(factory));
    }

    [Fact]
    public async Task CountWithoutQuantityRecordsTheCountedQuantity()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var warehouse = await CreateWarehouseAsync(client, "Kho kiểm kê");
        var inventory = await SeedInventoryAsync(
            factory,
            warehouse.Id,
            quantity: 5m,
            reservedQuantity: 1m);

        var response = await client.PostAsJsonAsync(
            "/api/stock-transactions",
            new CreateStockTransactionRequest
            {
                WarehouseId = warehouse.Id,
                TransactionType = StockTransactionTypes.Count,
                Notes = "Kiểm kê thực tế",
                Lines =
                [
                    new CreateStockTransactionLineRequest
                    {
                        ProductId = inventory.ProductId,
                        CountedQuantity = 4m
                    }
                ]
            });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(4m, await GetInventoryQuantityAsync(factory, inventory.ProductId, warehouse.Id));
        var transaction = await response.Content.ReadFromJsonAsync<StockTransactionResponse>();
        Assert.NotNull(transaction);
        var line = Assert.Single(transaction.Lines);
        Assert.Equal(-1m, line.Quantity);
        Assert.Equal(4m, line.CountedQuantity);
    }

    [Fact]
    public async Task TransferCreatesPairedTransactionsAndUpdatesBothWarehouses()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var source = await CreateWarehouseAsync(client, "Kho nguồn");
        var destination = await CreateWarehouseAsync(client, "Kho đích");
        var inventory = await SeedInventoryAsync(
            factory,
            source.Id,
            quantity: 10m,
            reservedQuantity: 2m);
        var transferRequest = CreateTransfer(source.Id, destination.Id, inventory.ProductId, 5m);

        var response = await client.PostAsJsonAsync(
            "/api/stock-transactions/transfer",
            transferRequest);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var transfer = await response.Content.ReadFromJsonAsync<StockTransferResponse>();
        Assert.NotNull(transfer);
        Assert.Equal(transfer.TransferId, transfer.OutboundTransaction.ReferenceId);
        Assert.Equal(transfer.TransferId, transfer.InboundTransaction.ReferenceId);
        Assert.Equal("Transfer", transfer.OutboundTransaction.ReferenceType);
        Assert.Equal("Transfer", transfer.InboundTransaction.ReferenceType);
        Assert.Equal(StockTransactionTypes.Export, transfer.OutboundTransaction.TransactionType);
        Assert.Equal(StockTransactionTypes.Import, transfer.InboundTransaction.TransactionType);
        Assert.Equal(source.Id, transfer.OutboundTransaction.WarehouseId);
        Assert.Equal(destination.Id, transfer.InboundTransaction.WarehouseId);
        Assert.Equal(-5m, Assert.Single(transfer.OutboundTransaction.Lines).Quantity);
        Assert.Equal(5m, Assert.Single(transfer.InboundTransaction.Lines).Quantity);
        Assert.Equal(5m, await GetInventoryQuantityAsync(factory, inventory.ProductId, source.Id));
        Assert.Equal(5m, await GetInventoryQuantityAsync(factory, inventory.ProductId, destination.Id));

        var retryResponse = await client.PostAsJsonAsync(
            "/api/stock-transactions/transfer",
            transferRequest);
        Assert.Equal(HttpStatusCode.OK, retryResponse.StatusCode);
        var retriedTransfer = await retryResponse.Content.ReadFromJsonAsync<StockTransferResponse>();
        Assert.NotNull(retriedTransfer);
        Assert.Equal(transfer.TransferId, retriedTransfer.TransferId);
        Assert.Equal(5m, await GetInventoryQuantityAsync(factory, inventory.ProductId, source.Id));
        Assert.Equal(5m, await GetInventoryQuantityAsync(factory, inventory.ProductId, destination.Id));

        var reusedKeyWithDifferentQuantity = await client.PostAsJsonAsync(
            "/api/stock-transactions/transfer",
            CreateTransfer(source.Id, destination.Id, inventory.ProductId, 4m, transfer.TransferId));
        Assert.Equal(HttpStatusCode.Conflict, reusedKeyWithDifferentQuantity.StatusCode);

        var history = await client.GetFromJsonAsync<StockTransactionListResponse>(
            $"/api/stock-transactions?referenceType=Transfer&referenceId={transfer.TransferId}");
        Assert.NotNull(history);
        Assert.Equal(2, history.TotalCount);
        Assert.Contains(history.Items, item => item.WarehouseId == source.Id);
        Assert.Contains(history.Items, item => item.WarehouseId == destination.Id);
    }

    [Fact]
    public async Task TransferRejectsSameWarehouseOrInsufficientAvailableStockWithoutChanges()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var source = await CreateWarehouseAsync(client, "Kho chuyển nguồn");
        var destination = await CreateWarehouseAsync(client, "Kho chuyển đích");
        var inventory = await SeedInventoryAsync(
            factory,
            source.Id,
            quantity: 5m,
            reservedQuantity: 3m);

        var sameWarehouse = await client.PostAsJsonAsync(
            "/api/stock-transactions/transfer",
            CreateTransfer(source.Id, source.Id, inventory.ProductId, 1m));
        Assert.Equal(HttpStatusCode.BadRequest, sameWarehouse.StatusCode);

        var insufficient = await client.PostAsJsonAsync(
            "/api/stock-transactions/transfer",
            CreateTransfer(source.Id, destination.Id, inventory.ProductId, 3m));
        Assert.Equal(HttpStatusCode.Conflict, insufficient.StatusCode);
        Assert.Equal(5m, await GetInventoryQuantityAsync(factory, inventory.ProductId, source.Id));
        Assert.Equal(0m, await GetInventoryQuantityAsync(factory, inventory.ProductId, destination.Id));
        Assert.Equal(0, await CountTransactionsAsync(factory));
    }

    private static CreateStockTransactionRequest CreateAdjustment(
        Guid warehouseId,
        Guid productId,
        decimal adjustment,
        string? notes) =>
        new()
        {
            WarehouseId = warehouseId,
            TransactionType = StockTransactionTypes.Adjust,
            Notes = notes,
            Lines =
            [
                new CreateStockTransactionLineRequest
                {
                    ProductId = productId,
                    Adjustment = adjustment
                }
            ]
        };

    private static CreateStockTransferRequest CreateTransfer(
        Guid sourceWarehouseId,
        Guid destinationWarehouseId,
        Guid productId,
        decimal quantity,
        Guid? transferId = null) =>
        new()
        {
            TransferId = transferId ?? Guid.NewGuid(),
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            Lines =
            [
                new CreateStockTransferLineRequest
                {
                    ProductId = productId,
                    Quantity = quantity
                }
            ]
        };

    private static async Task<WarehouseResponse> CreateWarehouseAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync(
            "/api/warehouses",
            new CreateWarehouseRequest { Name = name });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var warehouse = await response.Content.ReadFromJsonAsync<WarehouseResponse>();
        Assert.NotNull(warehouse);
        return warehouse;
    }

    private static async Task<TestInventorySeed> SeedInventoryAsync(
        ApiTestFactory factory,
        Guid warehouseId,
        decimal quantity,
        decimal reservedQuantity = 0m,
        decimal minStockAlert = 0m,
        string? productCode = null,
        string? productName = null)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = productCode ?? $"TEST-{Guid.NewGuid():N}",
            Name = productName ?? $"Test product {Guid.NewGuid():N}",
            CategoryId = Guid.NewGuid(),
            UnitId = Guid.NewGuid(),
            IsActive = true,
            MinStockAlert = minStockAlert
        };
        dbContext.Products.Add(product);
        dbContext.Inventories.Add(new Inventory
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            WarehouseId = warehouseId,
            Quantity = quantity,
            ReservedQuantity = reservedQuantity
        });
        await dbContext.SaveChangesAsync();
        return new TestInventorySeed(product.Id);
    }

    private static async Task<decimal> GetInventoryQuantityAsync(
        ApiTestFactory factory,
        Guid productId,
        Guid warehouseId)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.Inventories
            .Where(item => item.ProductId == productId && item.WarehouseId == warehouseId)
            .Select(item => item.Quantity)
            .SingleOrDefaultAsync();
    }

    private static async Task<int> CountTransactionsAsync(ApiTestFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.StockTransactions.CountAsync();
    }

    private sealed record TestInventorySeed(Guid ProductId);
}
