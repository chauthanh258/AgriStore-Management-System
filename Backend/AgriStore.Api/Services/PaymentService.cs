using System.Data;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Payments;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class PaymentService(ApplicationDbContext dbContext) : IPaymentService
{
    public async Task<PaymentResponse?> GetByOrderIdAsync(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.OrderId == orderId, cancellationToken);

        return payment is null ? null : Map(payment);
    }

    public async Task<PaymentResponse?> CreateAsync(
        Guid orderId,
        CreatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var order = await dbContext.Orders
            .SingleOrDefaultAsync(item => item.Id == orderId, cancellationToken);

        if (order is null)
        {
            return null;
        }

        if (order.Status is "Cancelled" or "Completed")
        {
            throw new InvalidOperationException("Không thể thanh toán đơn đã hủy hoặc hoàn tất.");
        }

        var method = request.PaymentMethod.Trim();
        var isOnlineOrder = order.ShippingAddressId.HasValue && order.ShippingMethodId.HasValue;

        if (method.Equals("CashOnDelivery", StringComparison.OrdinalIgnoreCase) && !isOnlineOrder)
        {
            throw new ArgumentException("Chỉ đơn online mới được chọn thanh toán khi nhận hàng.");
        }

        if (method.Equals("Cash", StringComparison.OrdinalIgnoreCase) && isOnlineOrder)
        {
            throw new ArgumentException("Đơn online hãy dùng CashOnDelivery nếu khách trả tiền mặt khi nhận hàng.");
        }

        if (order.TotalAmount <= 0)
        {
            throw new InvalidOperationException("Đơn hàng không có số tiền cần thanh toán.");
        }

        var paymentExists = await dbContext.Payments
            .AnyAsync(item => item.OrderId == orderId, cancellationToken);

        if (paymentExists)
        {
            throw new InvalidOperationException("Đơn hàng đã có giao dịch thanh toán.");
        }

        var paidImmediately = method.Equals("Cash", StringComparison.OrdinalIgnoreCase);
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            PaymentMethod = NormalizeMethod(method),
            Amount = order.TotalAmount,
            Status = paidImmediately ? "Paid" : "Pending",
            TransactionCode = CleanText(request.TransactionCode),
            PaidAt = paidImmediately ? DateTime.UtcNow : null,
            Notes = CleanText(request.Notes)
        };

        dbContext.Payments.Add(payment);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Map(payment);
    }

    public async Task<PaymentResponse?> UpdateStatusAsync(
        Guid orderId,
        UpdatePaymentStatusRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var payment = await dbContext.Payments
            .SingleOrDefaultAsync(item => item.OrderId == orderId, cancellationToken);

        if (payment is null)
        {
            return null;
        }

        var nextStatus = request.Status.Trim();
        var canChange = (payment.Status, nextStatus.ToUpperInvariant()) switch
        {
            ("Pending", "PAID") => true,
            ("Pending", "FAILED") => true,
            ("Failed", "PENDING") => true,
            ("Paid", "REFUNDED") => true,
            _ => false
        };

        if (!canChange)
        {
            throw new InvalidOperationException(
                $"Không thể chuyển trạng thái thanh toán từ {payment.Status} sang {nextStatus}.");
        }

        if (nextStatus.Equals("Paid", StringComparison.OrdinalIgnoreCase) &&
            payment.PaymentMethod == "CashOnDelivery")
        {
            var deliveryCompleted = await dbContext.Deliveries
                .AnyAsync(
                    item => item.OrderId == orderId && item.Status == "Delivered",
                    cancellationToken);

            if (!deliveryCompleted)
            {
                throw new InvalidOperationException(
                    "Chỉ xác nhận COD đã thanh toán sau khi giao hàng thành công.");
            }
        }

        payment.Status = NormalizeStatus(nextStatus);
        payment.Notes = CleanText(request.Notes) ?? payment.Notes;

        if (payment.Status == "Paid")
        {
            payment.PaidAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Map(payment);
    }

    internal static PaymentResponse Map(Payment payment) => new(
        payment.Id,
        payment.OrderId,
        payment.PaymentMethod,
        payment.Amount,
        payment.Status,
        payment.TransactionCode,
        payment.PaidAt is { } paidAt
            ? new DateTimeOffset(DateTime.SpecifyKind(paidAt, DateTimeKind.Utc))
            : null,
        payment.Notes);

    private static string NormalizeMethod(string method) => method.ToUpperInvariant() switch
    {
        "CASH" => "Cash",
        "BANKTRANSFER" => "BankTransfer",
        "CASHONDELIVERY" => "CashOnDelivery",
        _ => method
    };

    private static string NormalizeStatus(string status) => status.ToUpperInvariant() switch
    {
        "PAID" => "Paid",
        "FAILED" => "Failed",
        "PENDING" => "Pending",
        "REFUNDED" => "Refunded",
        _ => status
    };

    private static string? CleanText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}