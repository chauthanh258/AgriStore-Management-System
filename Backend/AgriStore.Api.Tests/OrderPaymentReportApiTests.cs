using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using AgriStore.Api.DTOs.Auth;
using AgriStore.Api.DTOs.Inventories;
using AgriStore.Api.DTOs.Orders;
using AgriStore.Api.DTOs.Payments;
using AgriStore.Api.DTOs.Reports;
using AgriStore.Api.DTOs.Warehouses;

namespace AgriStore.Api.Tests;

public sealed class OrderPaymentReportApiTests
{
    [Fact]
    public async Task AuthenticatedStaffSale_DeductsWarehouseStock_PaysAndAppearsInReports()
    {
        using var factory = new ApiTestFactory(useTestAuthentication: false);
        using var client = factory.CreateClient();
        var sale = await factory.SeedSaleAsync(quantity: 5);
        var request = new CreatePosOrderRequest(
            null,
            sale.WarehouseId,
            null,
            [new OrderItemRequest(sale.ProductId, 2)]);

        var anonymousResponse = await client.PostAsJsonAsync("/api/orders/pos", request);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);

        var customerLogin = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = "customer@agristore.local",
                Password = "AgriStore123"
            });
        Assert.Equal(HttpStatusCode.OK, customerLogin.StatusCode);
        var customerSession = await customerLogin.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(customerSession);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", customerSession.AccessToken);
        var customerInventoryResponse = await client.GetAsync("/api/inventories");
        Assert.True(
            customerInventoryResponse.StatusCode == HttpStatusCode.Forbidden,
            $"Expected customer role to be forbidden, got {customerInventoryResponse.StatusCode}: " +
            customerInventoryResponse.Headers.WwwAuthenticate);
        var customerOrderResponse = await client.PostAsJsonAsync("/api/orders/pos", request);
        Assert.Equal(HttpStatusCode.Forbidden, customerOrderResponse.StatusCode);

        var staffLogin = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = "staff@agristore.local",
                Password = "AgriStore123"
            });
        Assert.Equal(HttpStatusCode.OK, staffLogin.StatusCode);
        var staffSession = await staffLogin.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(staffSession);
        Assert.Contains("Staff", staffSession.Roles);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", staffSession.AccessToken);

        var warehouses = await client.GetFromJsonAsync<List<WarehouseResponse>>("/api/warehouses");
        Assert.NotNull(warehouses);
        Assert.Contains(warehouses, warehouse => warehouse.Id == sale.WarehouseId);

        var createdResponse = await client.PostAsJsonAsync("/api/orders/pos", request);
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var order = await createdResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        Assert.Equal(sale.WarehouseId, order.WarehouseId);
        Assert.Equal(staffSession.UserId, order.UserId);
        Assert.Equal("Confirmed", order.Status);

        var inventory = await client.GetFromJsonAsync<InventoryListResponse>(
            $"/api/inventories?productId={sale.ProductId}&warehouseId={sale.WarehouseId}");
        Assert.NotNull(inventory);
        var inventoryItem = Assert.Single(inventory.Items);
        Assert.Equal(3m, inventoryItem.Quantity);
        Assert.Equal(3m, inventoryItem.AvailableQuantity);

        var transactions = await client.GetFromJsonAsync<StockTransactionListResponse>(
            $"/api/stock-transactions?referenceType=Order&referenceId={order.Id}");
        Assert.NotNull(transactions);
        var stockTransaction = Assert.Single(transactions.Items);
        Assert.Equal("Export", stockTransaction.TransactionType);
        Assert.Equal(-2m, Assert.Single(stockTransaction.Lines).Quantity);

        var paymentResponse = await client.PostAsJsonAsync(
            $"/api/orders/{order.Id}/payment",
            new CreatePaymentRequest("Cash", null, null));
        Assert.Equal(HttpStatusCode.Created, paymentResponse.StatusCode);
        var payment = await paymentResponse.Content.ReadFromJsonAsync<PaymentResponse>();
        Assert.NotNull(payment);
        Assert.Equal("Paid", payment.Status);

        var revenue = await client.GetFromJsonAsync<RevenueReportResponse>(
            "/api/reports/revenue?fromDate=2000-01-01&toDate=2099-12-31&groupBy=day");
        Assert.NotNull(revenue);
        Assert.Equal(order.TotalAmount, revenue.TotalRevenue);
        Assert.Equal(1, revenue.PaidOrderCount);

        var topProducts = await client.GetFromJsonAsync<List<TopSellingProductResponse>>(
            "/api/reports/top-selling-products?fromDate=2000-01-01&toDate=2099-12-31&limit=5");
        Assert.NotNull(topProducts);
        var topProduct = Assert.Single(topProducts);
        Assert.Equal(sale.ProductId, topProduct.ProductId);
        Assert.Equal(2m, topProduct.QuantitySold);
        Assert.Equal(order.TotalAmount, topProduct.Revenue);
    }

    [Fact]
    public async Task CreatePosOrder_ReturnsConflict_WhenAvailableStockIsInsufficient()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var sale = await factory.SeedSaleAsync(quantity: 2);

        var response = await client.PostAsJsonAsync(
            "/api/orders/pos",
            new CreatePosOrderRequest(
                null,
                sale.WarehouseId,
                null,
                [new OrderItemRequest(sale.ProductId, 3)]));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(2m, await factory.GetInventoryQuantityAsync(sale));
    }

    [Fact]
    public async Task CancelConfirmedOrder_RestoresStock_AndListsCancelledOrder()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var sale = await factory.SeedSaleAsync(quantity: 10);
        var order = await CreatePosOrderAsync(client, sale, quantity: 4);
        var createPaymentResponse = await client.PostAsJsonAsync(
            $"/api/orders/{order.Id}/payment",
            new CreatePaymentRequest("BankTransfer", null, null));
        Assert.Equal(HttpStatusCode.Created, createPaymentResponse.StatusCode);

        Assert.Equal(6m, await factory.GetInventoryQuantityAsync(sale));

        var cancelResponse = await client.PatchAsJsonAsync(
            $"/api/orders/{order.Id}/status",
            new UpdateOrderStatusRequest("Cancelled"));

        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);
        var cancelledOrder = await cancelResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(cancelledOrder);
        Assert.Equal("Cancelled", cancelledOrder.Status);
        Assert.Equal(10m, await factory.GetInventoryQuantityAsync(sale));

        var payment = await client.GetFromJsonAsync<PaymentResponse>(
            $"/api/orders/{order.Id}/payment");
        Assert.NotNull(payment);
        Assert.Equal("Failed", payment.Status);
        var paymentUpdate = await client.PatchAsJsonAsync(
            $"/api/orders/{order.Id}/payment/status",
            new UpdatePaymentStatusRequest("Paid", null));
        Assert.Equal(HttpStatusCode.Conflict, paymentUpdate.StatusCode);

        var list = await client.GetFromJsonAsync<OrderListResponse>(
            "/api/orders?status=Cancelled&page=1&pageSize=10");
        Assert.NotNull(list);
        Assert.Equal(1, list.TotalCount);
        Assert.Single(list.Items);
        Assert.Single(list.Items.First().Details);
    }

    [Fact]
    public async Task CancelOrder_ReturnsConflict_WhenPaymentIsAlreadyPaid()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var sale = await factory.SeedSaleAsync(quantity: 10);
        var order = await CreatePosOrderAsync(client, sale, quantity: 2);

        var paymentResponse = await client.PostAsJsonAsync(
            $"/api/orders/{order.Id}/payment",
            new CreatePaymentRequest("Cash", null, null));
        Assert.Equal(HttpStatusCode.Created, paymentResponse.StatusCode);

        var cancelResponse = await client.PatchAsJsonAsync(
            $"/api/orders/{order.Id}/status",
            new UpdateOrderStatusRequest("Cancelled"));

        Assert.Equal(HttpStatusCode.Conflict, cancelResponse.StatusCode);
        Assert.Equal(8m, await factory.GetInventoryQuantityAsync(sale));
        var currentOrder = await client.GetFromJsonAsync<OrderResponse>($"/api/orders/{order.Id}");
        Assert.NotNull(currentOrder);
        Assert.Equal("Confirmed", currentOrder.Status);
    }

    [Fact]
    public async Task FailedPayment_IsExcludedFromRevenueAndTopSellingReports()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var sale = await factory.SeedSaleAsync(quantity: 10);
        var order = await CreatePosOrderAsync(client, sale, quantity: 2);

        var createPaymentResponse = await client.PostAsJsonAsync(
            $"/api/orders/{order.Id}/payment",
            new CreatePaymentRequest("BankTransfer", null, null));
        Assert.Equal(HttpStatusCode.Created, createPaymentResponse.StatusCode);

        var failedPaymentResponse = await client.PatchAsJsonAsync(
            $"/api/orders/{order.Id}/payment/status",
            new UpdatePaymentStatusRequest("Failed", "Giao dịch bị từ chối"));
        Assert.Equal(HttpStatusCode.OK, failedPaymentResponse.StatusCode);

        var revenue = await client.GetFromJsonAsync<RevenueReportResponse>(
            "/api/reports/revenue?fromDate=2000-01-01&toDate=2099-12-31&groupBy=day");
        Assert.NotNull(revenue);
        Assert.Equal(0m, revenue.TotalRevenue);
        Assert.Equal(0, revenue.PaidOrderCount);
        Assert.Empty(revenue.Periods);

        var topProducts = await client.GetFromJsonAsync<List<TopSellingProductResponse>>(
            "/api/reports/top-selling-products?fromDate=2000-01-01&toDate=2099-12-31&limit=5");
        Assert.NotNull(topProducts);
        Assert.Empty(topProducts);
    }

    [Fact]
    public async Task RevenueAndTopSellingReports_IncludePaidOrdersOnly()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var sale = await factory.SeedSaleAsync(quantity: 20);
        var paidOrder = await CreatePosOrderAsync(client, sale, quantity: 2);
        var paidResponse = await client.PostAsJsonAsync(
            $"/api/orders/{paidOrder.Id}/payment",
            new CreatePaymentRequest("Cash", null, null));
        Assert.Equal(HttpStatusCode.Created, paidResponse.StatusCode);

        var unpaidOrder = await CreatePosOrderAsync(client, sale, quantity: 3);
        var pendingResponse = await client.PostAsJsonAsync(
            $"/api/orders/{unpaidOrder.Id}/payment",
            new CreatePaymentRequest("BankTransfer", null, null));
        Assert.Equal(HttpStatusCode.Created, pendingResponse.StatusCode);

        var revenue = await client.GetFromJsonAsync<RevenueReportResponse>(
            "/api/reports/revenue?fromDate=2000-01-01&toDate=2099-12-31&groupBy=day");
        Assert.NotNull(revenue);
        Assert.Equal(200m, revenue.TotalRevenue);
        Assert.Equal(1, revenue.PaidOrderCount);
        Assert.Single(revenue.Periods);

        var topProducts = await client.GetFromJsonAsync<List<TopSellingProductResponse>>(
            "/api/reports/top-selling-products?fromDate=2000-01-01&toDate=2099-12-31&limit=5");
        Assert.NotNull(topProducts);
        var topProduct = Assert.Single(topProducts);
        Assert.Equal(sale.ProductId, topProduct.ProductId);
        Assert.Equal(2m, topProduct.QuantitySold);
        Assert.Equal(200m, topProduct.Revenue);
    }

    private static async Task<OrderResponse> CreatePosOrderAsync(
        HttpClient client,
        SaleSeed sale,
        decimal quantity)
    {
        var response = await client.PostAsJsonAsync(
            "/api/orders/pos",
            new CreatePosOrderRequest(
                null,
                sale.WarehouseId,
                null,
                [new OrderItemRequest(sale.ProductId, quantity)]));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        return order;
    }
}
