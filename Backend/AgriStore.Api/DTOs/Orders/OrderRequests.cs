using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Orders;

public sealed record OrderItemRequest(
    Guid ProductId,

    [param: Range(0.001, 1000000, ErrorMessage = "Số lượng phải lớn hơn 0.")]
    decimal Quantity
);

public sealed record CreatePosOrderRequest(
    Guid? CustomerId,
    Guid? WarehouseId,

    [param: StringLength(1000)]
    string? Note,

    [param: Required(ErrorMessage = "Đơn hàng phải có ít nhất một sản phẩm.")]
    [param: MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất một sản phẩm.")]
    IReadOnlyCollection<OrderItemRequest> Items
);

public sealed record CreateOnlineOrderRequest(
    Guid CustomerId,
    Guid ShippingAddressId,
    Guid ShippingMethodId,
    Guid? WarehouseId,

    [param: StringLength(1000)]
    string? Note,

    [param: Required(ErrorMessage = "Đơn hàng phải có ít nhất một sản phẩm.")]
    [param: MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất một sản phẩm.")]
    IReadOnlyCollection<OrderItemRequest> Items
);

public sealed record UpdateOrderRequest(
    Guid? CustomerId,
    Guid? ShippingAddressId,
    Guid? ShippingMethodId,
    Guid? WarehouseId,

    [param: StringLength(1000)]
    string? Note,

    [param: Required(ErrorMessage = "Đơn hàng phải có ít nhất một sản phẩm.")]
    [param: MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất một sản phẩm.")]
    IReadOnlyCollection<OrderItemRequest> Items
);

public sealed record OrderListQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    string? Status = null,
    Guid? CustomerId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null
);

public sealed record UpdateOrderStatusRequest(
    [param: Required(ErrorMessage = "Trạng thái đơn hàng là bắt buộc.")]
    string Status
);