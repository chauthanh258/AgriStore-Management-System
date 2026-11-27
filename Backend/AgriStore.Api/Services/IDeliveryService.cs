using AgriStore.Api.DTOs.Deliveries;

namespace AgriStore.Api.Services;

public interface IDeliveryService
{
    Task<DeliveryResponse?> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken);
    Task<DeliveryResponse?> CreateAsync(
        Guid orderId,
        CreateDeliveryRequest request,
        CancellationToken cancellationToken);
    Task<DeliveryResponse?> UpdateStatusAsync(
        Guid orderId,
        UpdateDeliveryStatusRequest request,
        CancellationToken cancellationToken);
}