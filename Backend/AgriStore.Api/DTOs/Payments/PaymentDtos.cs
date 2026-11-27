using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Payments;

/// <summary>Payload tạo thanh toán cho một đơn hàng.</summary>
public sealed record CreatePaymentRequest(
	[param: Required(ErrorMessage = "Phương thức thanh toán là bắt buộc.")]
	[param: RegularExpression("(?i)^(Cash|BankTransfer|CashOnDelivery)$", ErrorMessage = "Phương thức thanh toán không hợp lệ.")]
	string PaymentMethod,

	[param: StringLength(100)]
	string? TransactionCode,

	[param: StringLength(1000)]
	string? Notes
);

/// <summary>Payload cập nhật trạng thái giao dịch thanh toán.</summary>
public sealed record UpdatePaymentStatusRequest(
	[param: Required(ErrorMessage = "Trạng thái thanh toán là bắt buộc.")]
	[param: RegularExpression("(?i)^(Pending|Paid|Failed|Refunded)$", ErrorMessage = "Trạng thái thanh toán không hợp lệ.")]
	string Status,

	[param: StringLength(1000)]
	string? Notes
);

/// <summary>Thông tin thanh toán trả về từ API.</summary>
public sealed record PaymentResponse(
	Guid Id,
	Guid OrderId,
	string PaymentMethod,
	decimal Amount,
	string Status,
	string? TransactionCode,
	DateTimeOffset? PaidAt,
	string? Notes
);
