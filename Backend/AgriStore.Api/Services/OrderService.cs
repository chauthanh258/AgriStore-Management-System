using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Inventories;
using AgriStore.Api.DTOs.Orders;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class OrderService(
    ApplicationDbContext dbContext,
    IStockTransactionService stockTransactionService) : IOrderService
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
            request.WarehouseId,
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
            request.WarehouseId,
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
            order.WarehouseId = await ResolveWarehouseIdAsync(request.WarehouseId, cancellationToken);
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
            order.WarehouseId = await ResolveWarehouseIdAsync(request.WarehouseId, cancellationToken);
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

        dbContext.OrderDetails.RemoveRange(oldDetails);
        dbContext.OrderDetails.AddRange(details);

        var subTotal = details.Sum(item => item.TotalPrice);

        order.Note = CleanText(request.Note);
        order.SubTotal = subTotal;
        order.DiscountAmount = 0;
        order.ShippingFee = shippingFee;
        order.TotalAmount = subTotal + shippingFee;

        await dbContext.SaveChangesAsync(cancellationToken);

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

        if (order.Status == "Pending" && nextStatus == "Confirmed")
        {
            var details = await dbContext.OrderDetails
                .AsNoTracking()
                .Where(item => item.OrderId == order.Id)
                .Select(item => new CreateStockTransactionLineRequest
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity
                })
                .ToListAsync(cancellationToken);

            var exportResult = await stockTransactionService.CreateAsync(
                new CreateStockTransactionRequest
                {
                    WarehouseId = await ResolveWarehouseIdAsync(order.WarehouseId, cancellationToken),
                    TransactionType = StockTransactionTypes.Export,
                    ReferenceType = "Order",
                    ReferenceId = order.Id,
                    Notes = $"Xuất kho cho đơn hàng {order.Code}",
                    Lines = details
                },
                order.UserId,
                cancellationToken);

            if (!exportResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join(" ", exportResult.Errors));
            }
        }

        order.Status = nextStatus;
        await dbContext.SaveChangesAsync(cancellationToken);

        return await MapOrderAsync(order, cancellationToken);
    }

    private async Task<OrderResponse> CreateAsync(
        Guid? customerId,
        Guid? warehouseId,
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
            WarehouseId = await ResolveWarehouseIdAsync(warehouseId, cancellationToken),
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
            order.WarehouseId,
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

    private async Task<Guid> ResolveWarehouseIdAsync(
        Guid? warehouseId,
        CancellationToken cancellationToken)
    {
        var warehouse = await dbContext.Warehouses
            .AsNoTracking()
            .Where(item => item.IsActive &&
                           (warehouseId.HasValue
                               ? item.Id == warehouseId.Value
                               : item.IsDefault))
            .Select(item => item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (warehouse == Guid.Empty)
        {
            throw new ArgumentException("Kho xuất không tồn tại hoặc chưa có kho mặc định đang hoạt động.");
        }

        return warehouse;
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