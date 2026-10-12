using AgriStore.Api.DTOs.Orders;

namespace AgriStore.Api.Services;

public interface IOrderService
{
    Task<OrderListResponse> GetPagedAsync(
        OrderListQuery query,
        CancellationToken cancellationToken);

    Task<OrderResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<OrderResponse> CreatePosAsync(
        CreatePosOrderRequest request,
        Guid? createdByUserId,
        CancellationToken cancellationToken);

    Task<OrderResponse> CreateOnlineAsync(
        CreateOnlineOrderRequest request,
        Guid? createdByUserId,
        CancellationToken cancellationToken);

    Task<OrderResponse?> UpdateAsync(
        Guid id,
        UpdateOrderRequest request,
        CancellationToken cancellationToken);

    Task<OrderResponse?> UpdateStatusAsync(
        Guid id,
        UpdateOrderStatusRequest request,
        CancellationToken cancellationToken);

    Task<OrderResponse?> ApplyCouponAsync(
        Guid id,
        ApplyCouponRequest request,
        CancellationToken cancellationToken);
}