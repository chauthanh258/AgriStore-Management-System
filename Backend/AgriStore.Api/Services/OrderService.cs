using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Orders;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class OrderService(ApplicationDbContext dbContext) : IOrderService
{
    private const int MaxPageSize = 100;

    public async Task<OrderListResponse> GetPagedAsync(
        OrderListQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var ordersQuery = dbContext.Orders.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            ordersQuery = ordersQuery.Where(order => order.Code.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = query.Status.Trim();
            ordersQuery = ordersQuery.Where(order => order.Status == status);
        }

        if (query.CustomerId.HasValue)
        {
            ordersQuery = ordersQuery.Where(
                order => order.CustomerId == query.CustomerId.Value);
        }

        if (query.FromDate.HasValue)
        {
            var fromDate = query.FromDate.Value.ToUniversalTime();
            ordersQuery = ordersQuery.Where(order => order.OrderDate >= fromDate);
        }

        if (query.ToDate.HasValue)
        {
            var toDate = query.ToDate.Value.Date.AddDays(1).ToUniversalTime();
            ordersQuery = ordersQuery.Where(order => order.OrderDate < toDate);
        }

        var totalCount = await ordersQuery.CountAsync(cancellationToken);

        var orders = await ordersQuery
            .OrderByDescending(order => order.OrderDate)
            .ThenByDescending(order => order.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var responses = new List<OrderResponse>();

        foreach (var order in orders)
        {
            responses.Add(await MapOrderAsync(order, cancellationToken));
        }

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new OrderListResponse(
            responses,
            page,
            pageSize,
            totalCount,
            totalPages);
    }

    public async Task<OrderResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return order is null
            ? null
            : await MapOrderAsync(order, cancellationToken);
    }

    public Task<OrderResponse> CreatePosAsync(
        CreatePosOrderRequest request,
        Guid? createdByUserId,
        CancellationToken cancellationToken)
    {
        return CreateAsync(
            request.CustomerId,
            null,
            null,
            request.Note,
            request.Items,
            "Confirmed",
            createdByUserId,
            cancellationToken);
    }

    public async Task<OrderResponse> CreateOnlineAsync(
        CreateOnlineOrderRequest request,
        Guid? createdByUserId,
        CancellationToken cancellationToken)
    {
        if (request.CustomerId == Guid.Empty ||
            request.ShippingAddressId == Guid.Empty ||
            request.ShippingMethodId == Guid.Empty)
        {
            throw new ArgumentException(
                "Đơn online phải có khách hàng, địa chỉ và phương thức giao hàng.");
        }

        return await CreateAsync(
            request.CustomerId,
            request.ShippingAddressId,
            request.ShippingMethodId,
            request.Note,
            request.Items,
            "Pending",
            createdByUserId,
            cancellationToken);
    }

    public async Task<OrderResponse?> UpdateAsync(
        Guid id,
        UpdateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return null;
        }

        if (!string.Equals(order.Status, "Pending", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Chỉ được sửa đơn hàng đang ở trạng thái Pending.");
        }

        var isOnlineOrder = order.ShippingAddressId.HasValue ||
                            order.ShippingMethodId.HasValue;

        decimal shippingFee = 0;

        if (isOnlineOrder)
        {
            if (!request.CustomerId.HasValue ||
                !request.ShippingAddressId.HasValue ||
                !request.ShippingMethodId.HasValue)
            {
                throw new ArgumentException(
                    "Đơn online phải có khách hàng, địa chỉ và phương thức giao hàng.");
            }

            shippingFee = await ValidateOnlineInformationAsync(
                request.CustomerId.Value,
                request.ShippingAddressId.Value,
                request.ShippingMethodId.Value,
                cancellationToken);

            order.CustomerId = request.CustomerId;
            order.ShippingAddressId = request.ShippingAddressId;
            order.ShippingMethodId = request.ShippingMethodId;
        }
        else
        {
            if (request.ShippingAddressId.HasValue ||
                request.ShippingMethodId.HasValue)
            {
                throw new ArgumentException(
                    "Không thể thêm thông tin giao hàng cho đơn POS.");
            }

            await ValidateCustomerAsync(request.CustomerId, cancellationToken);

            order.CustomerId = request.CustomerId;
            order.ShippingAddressId = null;
            order.ShippingMethodId = null;
        }

        var details = await BuildOrderDetailsAsync(
            order.Id,
            request.Items,
            cancellationToken);

        var oldDetails = await dbContext.OrderDetails
            .Where(item => item.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        if (order.CouponId.HasValue)
        {
            var appliedCouponId = order.CouponId.Value;
            await dbContext.Coupons
                .Where(coupon => coupon.Id == appliedCouponId && coupon.UsedCount > 0)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(coupon => coupon.UsedCount, coupon => coupon.UsedCount - 1),
                    cancellationToken);
        }

        dbContext.OrderDetails.RemoveRange(oldDetails);
        dbContext.OrderDetails.AddRange(details);

        var subTotal = details.Sum(item => item.TotalPrice);

        order.Note = CleanText(request.Note);
        order.SubTotal = subTotal;
        order.CouponId = null;
        order.DiscountAmount = 0;
        order.ShippingFee = shippingFee;
        order.TotalAmount = subTotal + shippingFee;

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await MapOrderAsync(order, cancellationToken);
    }

    public async Task<OrderResponse?> UpdateStatusAsync(
        Guid id,
        UpdateOrderStatusRequest request,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return null;
        }

        var nextStatus = request.Status.Trim();

        if (!CanChangeStatus(order.Status, nextStatus))
        {
            throw new ArgumentException(
                $"Không thể chuyển trạng thái từ {order.Status} sang {nextStatus}.");
        }

        order.Status = nextStatus;
        await dbContext.SaveChangesAsync(cancellationToken);

        return await MapOrderAsync(order, cancellationToken);
    }

    public async Task<OrderResponse?> ApplyCouponAsync(
        Guid id,
        ApplyCouponRequest request,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return null;
        }

        if (!string.Equals(order.Status, "Pending", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Chỉ được áp dụng mã giảm giá cho đơn hàng đang ở trạng thái Pending.");
        }

        if (order.CouponId.HasValue)
        {
            throw new InvalidOperationException(
                "Đơn hàng đã áp dụng mã giảm giá.");
        }

        var code = request.Code.Trim();
        var coupon = await dbContext.Coupons
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Code.ToUpper() == code.ToUpper(),
                cancellationToken);

        if (coupon is null || !coupon.IsActive)
        {
            throw new ArgumentException("Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.");
        }

        var now = DateTime.UtcNow;

        if (now < coupon.StartDate || now > coupon.EndDate)
        {
            throw new ArgumentException("Mã giảm giá chưa có hiệu lực hoặc đã hết hạn.");
        }

        if (coupon.MinOrderAmount.HasValue && order.SubTotal < coupon.MinOrderAmount.Value)
        {
            throw new ArgumentException(
                $"Đơn hàng chưa đạt giá trị tối thiểu {coupon.MinOrderAmount.Value:0.##}.");
        }

        var discountAmount = coupon.DiscountType.ToUpperInvariant() switch
        {
            "PERCENT" => order.SubTotal * coupon.DiscountValue / 100m,
            "FIXED" => coupon.DiscountValue,
            _ => throw new ArgumentException("Loại giảm giá của mã không được hỗ trợ.")
        };

        if (coupon.MaxDiscount.HasValue)
        {
            discountAmount = Math.Min(discountAmount, coupon.MaxDiscount.Value);
        }

        discountAmount = Math.Clamp(discountAmount, 0m, order.SubTotal);

        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var couponUsageUpdated = await dbContext.Coupons
            .Where(item => item.Id == coupon.Id &&
                           (!item.UsageLimit.HasValue || item.UsedCount < item.UsageLimit.Value))
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(item => item.UsedCount, item => item.UsedCount + 1),
                cancellationToken);

        if (couponUsageUpdated == 0)
        {
            throw new ArgumentException("Mã giảm giá đã hết lượt sử dụng.");
        }

        var orderUpdated = await dbContext.Orders
            .Where(item => item.Id == id &&
                           item.Status == "Pending" &&
                           item.CouponId == null)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(item => item.CouponId, coupon.Id)
                    .SetProperty(item => item.DiscountAmount, discountAmount)
                    .SetProperty(item => item.TotalAmount, order.SubTotal - discountAmount + order.ShippingFee),
                cancellationToken);

        if (orderUpdated == 0)
        {
            throw new InvalidOperationException(
                "Đơn hàng đã thay đổi hoặc đã áp dụng mã giảm giá.");
        }

        order.CouponId = coupon.Id;
        order.DiscountAmount = discountAmount;
        order.TotalAmount = order.SubTotal - discountAmount + order.ShippingFee;

        await transaction.CommitAsync(cancellationToken);

        return await MapOrderAsync(order, cancellationToken);
    }

    private async Task<OrderResponse> CreateAsync(
        Guid? customerId,
        Guid? shippingAddressId,
        Guid? shippingMethodId,
        string? note,
        IReadOnlyCollection<OrderItemRequest> items,
        string status,
        Guid? createdByUserId,
        CancellationToken cancellationToken)
    {
        await ValidateCustomerAsync(customerId, cancellationToken);

        var shippingFee = 0m;

        if (shippingAddressId.HasValue || shippingMethodId.HasValue)
        {
            if (!customerId.HasValue ||
                !shippingAddressId.HasValue ||
                !shippingMethodId.HasValue)
            {
                throw new ArgumentException(
                    "Thông tin giao hàng của đơn online chưa đầy đủ.");
            }

            shippingFee = await ValidateOnlineInformationAsync(
                customerId.Value,
                shippingAddressId.Value,
                shippingMethodId.Value,
                cancellationToken);
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            Code = GenerateOrderCode(),
            CustomerId = customerId,
            UserId = createdByUserId,
            OrderDate = DateTime.UtcNow,
            Status = status,
            ShippingAddressId = shippingAddressId,
            ShippingMethodId = shippingMethodId,
            Note = CleanText(note),
            DiscountAmount = 0,
            ShippingFee = shippingFee
        };

        var details = await BuildOrderDetailsAsync(
            order.Id,
            items,
            cancellationToken);

        order.SubTotal = details.Sum(item => item.TotalPrice);
        order.TotalAmount = order.SubTotal + order.ShippingFee;

        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        dbContext.Orders.Add(order);
        dbContext.OrderDetails.AddRange(details);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await MapOrderAsync(order, cancellationToken);
    }

    private async Task<List<OrderDetail>> BuildOrderDetailsAsync(
        Guid orderId,
        IReadOnlyCollection<OrderItemRequest> items,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            throw new ArgumentException("Đơn hàng phải có ít nhất một sản phẩm.");
        }

        if (items.Any(item => item.ProductId == Guid.Empty || item.Quantity <= 0))
        {
            throw new ArgumentException(
                "Sản phẩm và số lượng trong đơn hàng không hợp lệ.");
        }

        var productIds = items.Select(item => item.ProductId).ToList();

        if (productIds.Distinct().Count() != productIds.Count)
        {
            throw new ArgumentException(
                "Một sản phẩm chỉ được xuất hiện một lần trong đơn hàng.");
        }

        var products = await dbContext.Products
            .AsNoTracking()
            .Where(product => productIds.Contains(product.Id))
            .ToListAsync(cancellationToken);

        if (products.Count != productIds.Count)
        {
            throw new ArgumentException("Có sản phẩm không tồn tại.");
        }

        if (products.Any(product => !product.IsActive))
        {
            throw new ArgumentException(
                "Không thể thêm sản phẩm đang ngừng kinh doanh vào đơn hàng.");
        }

        var productById = products.ToDictionary(product => product.Id);

        return items.Select(item =>
        {
            var product = productById[item.ProductId];
            var totalPrice = product.SellingPrice * item.Quantity;

            return new OrderDetail
            {
                Id = Guid.NewGuid(),
                OrderId = orderId,
                ProductId = product.Id,
                Quantity = item.Quantity,
                UnitPrice = product.SellingPrice,
                Discount = 0,
                TotalPrice = totalPrice
            };
        }).ToList();
    }

    private async Task ValidateCustomerAsync(
        Guid? customerId,
        CancellationToken cancellationToken)
    {
        if (!customerId.HasValue)
        {
            return;
        }

        var customerExists = await dbContext.Customers
            .AsNoTracking()
            .AnyAsync(customer => customer.Id == customerId.Value, cancellationToken);

        if (!customerExists)
        {
            throw new ArgumentException("Khách hàng không tồn tại.");
        }
    }

    private async Task<decimal> ValidateOnlineInformationAsync(
        Guid customerId,
        Guid shippingAddressId,
        Guid shippingMethodId,
        CancellationToken cancellationToken)
    {
        var addressExists = await dbContext.Addresses
            .AsNoTracking()
            .AnyAsync(
                address => address.Id == shippingAddressId &&
                           address.CustomerId == customerId,
                cancellationToken);

        if (!addressExists)
        {
            throw new ArgumentException(
                "Địa chỉ giao hàng không thuộc khách hàng đã chọn.");
        }

        var shippingMethod = await dbContext.ShippingMethods
            .AsNoTracking()
            .SingleOrDefaultAsync(
                method => method.Id == shippingMethodId && method.IsActive,
                cancellationToken);

        if (shippingMethod is null)
        {
            throw new ArgumentException(
                "Phương thức giao hàng không tồn tại hoặc đã ngừng hoạt động.");
        }

        return shippingMethod.Fee;
    }

    private async Task<OrderResponse> MapOrderAsync(
        Order order,
        CancellationToken cancellationToken)
    {
        var details = await (
            from detail in dbContext.OrderDetails.AsNoTracking()
            join product in dbContext.Products.AsNoTracking()
                on detail.ProductId equals product.Id
            where detail.OrderId == order.Id
            orderby detail.Id
            select new OrderDetailResponse(
                detail.Id,
                product.Id,
                product.Code,
                product.Name,
                detail.Quantity,
                detail.UnitPrice,
                detail.Discount,
                detail.TotalPrice))
            .ToListAsync(cancellationToken);

        return new OrderResponse(
            order.Id,
            order.Code,
            order.CustomerId,
            order.UserId,
            order.OrderDate,
            order.Status,
            order.ShippingAddressId,
            order.ShippingMethodId,
            order.SubTotal,
            order.DiscountAmount,
            order.ShippingFee,
            order.TotalAmount,
            order.Note,
            order.CouponId,
            details);
    }

    private static bool CanChangeStatus(string currentStatus, string nextStatus)
    {
        return (currentStatus, nextStatus) switch
        {
            ("Pending", "Confirmed") => true,
            ("Pending", "Cancelled") => true,
            ("Confirmed", "Shipping") => true,
            ("Confirmed", "Cancelled") => true,
            ("Shipping", "Completed") => true,
            _ => false
        };
    }

    private static string GenerateOrderCode()
    {
        var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"ORD-{DateTime.UtcNow:yyyyMMdd}-{suffix}";
    }

    private static string? CleanText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}