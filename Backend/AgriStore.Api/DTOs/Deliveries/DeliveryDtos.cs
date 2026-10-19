using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Deliveries;

/// <summary>Thông tin tạo vận đơn cho đơn hàng online đã xác nhận.</summary>
public sealed record CreateDeliveryRequest(
	[param: StringLength(100)]
	string? TrackingCode,

	[param: StringLength(200)]
	string? ShipperName,

	[param: StringLength(30)]
	string? ShipperPhone,

	[param: StringLength(1000)]
	string? Notes
);

/// <summary>Payload cập nhật trạng thái giao hàng.</summary>
public sealed record UpdateDeliveryStatusRequest(
	[param: Required(ErrorMessage = "Trạng thái giao hàng là bắt buộc.")]
	[param: RegularExpression("(?i)^(Preparing|Shipped|Delivered|Failed)$", ErrorMessage = "Trạng thái giao hàng không hợp lệ.")]
	string Status,

	[param: StringLength(1000)]
	string? Notes
);

/// <summary>Thông tin vận đơn trả về từ API.</summary>
public sealed record DeliveryResponse(
	Guid Id,
	Guid OrderId,
	string? TrackingCode,
	string? ShipperName,
	string? ShipperPhone,
	string Status,
	DateTimeOffset? ShippedAt,
	DateTimeOffset? DeliveredAt,
	string? Notes
);
