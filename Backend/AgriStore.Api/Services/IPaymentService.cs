using AgriStore.Api.DTOs.Payments;

namespace AgriStore.Api.Services;

public interface IPaymentService
{
    Task<PaymentResponse?> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken);
    Task<PaymentResponse?> CreateAsync(
        Guid orderId,
        CreatePaymentRequest request,
        CancellationToken cancellationToken);
    Task<PaymentResponse?> UpdateStatusAsync(
        Guid orderId,
        UpdatePaymentStatusRequest request,
        CancellationToken cancellationToken);
}