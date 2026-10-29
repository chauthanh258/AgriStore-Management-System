using System.Data;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Deliveries;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class DeliveryService(ApplicationDbContext dbContext) : IDeliveryService
{
    public async Task<DeliveryResponse?> GetByOrderIdAsync(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var delivery = await dbContext.Deliveries
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.OrderId == orderId, cancellationToken);

        return delivery is null ? null : Map(delivery);
    }

    public async Task<DeliveryResponse?> CreateAsync(
        Guid orderId,
        CreateDeliveryRequest request,
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

        if (!order.ShippingAddressId.HasValue || !order.ShippingMethodId.HasValue)
        {
            throw new ArgumentException("Không thể tạo vận đơn cho đơn POS không có thông tin giao hàng.");
        }

        if (order.Status != "Confirmed")
        {
            throw new InvalidOperationException("Chỉ tạo vận đơn cho đơn hàng đã xác nhận.");
        }

        var deliveryExists = await dbContext.Deliveries
            .AnyAsync(item => item.OrderId == orderId, cancellationToken);

        if (deliveryExists)
        {
            throw new InvalidOperationException("Đơn hàng đã có vận đơn.");
        }

        var delivery = new Delivery
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            TrackingCode = CleanText(request.TrackingCode),
            ShipperName = CleanText(request.ShipperName),
            ShipperPhone = CleanText(request.ShipperPhone),
            Status = "Preparing",
            Notes = CleanText(request.Notes)
        };

        dbContext.Deliveries.Add(delivery);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Map(delivery);
    }

    public async Task<DeliveryResponse?> UpdateStatusAsync(
        Guid orderId,
        UpdateDeliveryStatusRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var delivery = await dbContext.Deliveries
            .SingleOrDefaultAsync(item => item.OrderId == orderId, cancellationToken);

        if (delivery is null)
        {
            return null;
        }

        var order = await dbContext.Orders
            .SingleAsync(item => item.Id == orderId, cancellationToken);
        var nextStatus = NormalizeStatus(request.Status.Trim());

        var canChange = (delivery.Status, nextStatus) switch
        {
            ("Preparing", "Shipped") => true,
            ("Shipped", "Delivered") => true,
            ("Shipped", "Failed") => true,
            ("Failed", "Shipped") => true,
            _ => false
        };

        if (!canChange)
        {
            throw new InvalidOperationException(
                $"Không thể chuyển trạng thái giao hàng từ {delivery.Status} sang {nextStatus}.");
        }

        if (nextStatus == "Shipped")
        {
            var payment = await dbContext.Payments
                .SingleOrDefaultAsync(item => item.OrderId == orderId, cancellationToken);
            var isPendingCod = payment?.PaymentMethod == "CashOnDelivery" && payment.Status == "Pending";

            if (payment is null || (payment.Status != "Paid" && !isPendingCod))
            {
                throw new InvalidOperationException(
                    "Đơn hàng cần có payment đã thanh toán hoặc COD đang chờ thu tiền trước khi giao.");
            }

            if (order.Status == "Confirmed")
            {
                order.Status = "Shipping";
            }
            else if (order.Status != "Shipping")
            {
                throw new InvalidOperationException("Đơn hàng không ở trạng thái có thể bắt đầu giao.");
            }

            delivery.ShippedAt ??= DateTime.UtcNow;
        }
        else if (nextStatus == "Delivered")
        {
            if (order.Status != "Shipping")
            {
                throw new InvalidOperationException("Đơn hàng phải ở trạng thái Shipping trước khi hoàn tất giao.");
            }

            order.Status = "Completed";
            delivery.DeliveredAt = DateTime.UtcNow;

            var codPayment = await dbContext.Payments
                .SingleOrDefaultAsync(
                    item => item.OrderId == orderId && item.PaymentMethod == "CashOnDelivery",
                    cancellationToken);

            if (codPayment is not null && codPayment.Status == "Pending")
            {
                codPayment.Status = "Paid";
                codPayment.PaidAt = DateTime.UtcNow;
            }
        }

        delivery.Status = nextStatus;
        delivery.Notes = CleanText(request.Notes) ?? delivery.Notes;

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Map(delivery);
    }

    private static DeliveryResponse Map(Delivery delivery) => new(
        delivery.Id,
        delivery.OrderId,
        delivery.TrackingCode,
        delivery.ShipperName,
        delivery.ShipperPhone,
        delivery.Status,
        ToUtcOffset(delivery.ShippedAt),
        ToUtcOffset(delivery.DeliveredAt),
        delivery.Notes);

    private static DateTimeOffset? ToUtcOffset(DateTime? value) => value is { } dateTime
        ? new DateTimeOffset(DateTime.SpecifyKind(dateTime, DateTimeKind.Utc))
        : null;

    private static string NormalizeStatus(string status) => status.ToUpperInvariant() switch
    {
        "PREPARING" => "Preparing",
        "SHIPPED" => "Shipped",
        "DELIVERED" => "Delivered",
        "FAILED" => "Failed",
        _ => status
    };

    private static string? CleanText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}