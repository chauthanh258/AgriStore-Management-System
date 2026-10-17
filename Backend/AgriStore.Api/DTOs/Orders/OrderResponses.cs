namespace AgriStore.Api.DTOs.Orders;

public sealed record OrderDetailResponse(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount,
    decimal TotalPrice
);

public sealed record OrderResponse(
    Guid Id,
    string Code,
    Guid? WarehouseId,
    Guid? CustomerId,
    Guid? UserId,
    DateTime OrderDate,
    string Status,
    Guid? ShippingAddressId,
    Guid? ShippingMethodId,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal ShippingFee,
    decimal TotalAmount,
    string? Note,
    Guid? CouponId,
    IReadOnlyCollection<OrderDetailResponse> Details
);

public sealed record OrderListResponse(
    IReadOnlyCollection<OrderResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);