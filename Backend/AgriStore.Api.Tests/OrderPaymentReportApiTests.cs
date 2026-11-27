using System.Net;
using System.Net.Http.Json;
using AgriStore.Api.DTOs.Orders;
using AgriStore.Api.DTOs.Payments;
using AgriStore.Api.DTOs.Reports;

namespace AgriStore.Api.Tests;

public sealed class OrderPaymentReportApiTests
{
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
