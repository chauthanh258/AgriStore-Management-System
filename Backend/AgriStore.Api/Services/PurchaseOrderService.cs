using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.PurchaseOrders;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class PurchaseOrderService(ApplicationDbContext dbContext) : IPurchaseOrderService
{
    public async Task<PurchaseOrderResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var order = await dbContext.PurchaseOrders
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return order is null ? null : await MapAsync(order, cancellationToken);
    }

    public async Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> CreateAsync(
        PurchaseOrderRequest request,
        CancellationToken cancellationToken)
    {
        var validation = await ValidateAsync(request, cancellationToken);
        if (validation.Count > 0)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(400, validation.ToArray());
        }

        var order = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            Code = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..20],
            SupplierId = request.SupplierId,
            WarehouseId = request.WarehouseId,
            OrderDate = request.OrderDate.UtcDateTime,
            ExpectedDate = request.ExpectedDate?.UtcDateTime,
            Status = "Draft",
            Notes = Normalize(request.Notes),
            TotalAmount = request.Details.Sum(detail => detail.Quantity * detail.UnitPrice)
        };

        dbContext.PurchaseOrders.Add(order);
        dbContext.PurchaseOrderDetails.AddRange(request.Details.Select(detail => CreateDetail(order.Id, detail)));
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await MapAsync(order, cancellationToken);
        return PurchaseOrderServiceResult<PurchaseOrderResponse>.Success(response, 201);
    }

    public async Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> UpdateAsync(
        Guid id,
        PurchaseOrderRequest request,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.PurchaseOrders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(404, "Không tìm thấy đơn nhập hàng.");
        }

        if (order.Status != "Draft")
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(409, "Chỉ có thể sửa đơn nhập hàng ở trạng thái Draft.");
        }

        var validation = await ValidateAsync(request, cancellationToken);
        if (validation.Count > 0)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(400, validation.ToArray());
        }

        order.SupplierId = request.SupplierId;
        order.WarehouseId = request.WarehouseId;
        order.OrderDate = request.OrderDate.UtcDateTime;
        order.ExpectedDate = request.ExpectedDate?.UtcDateTime;
        order.Notes = Normalize(request.Notes);
        order.TotalAmount = request.Details.Sum(detail => detail.Quantity * detail.UnitPrice);

        var currentDetails = await dbContext.PurchaseOrderDetails
            .Where(detail => detail.PurchaseOrderId == id)
            .ToListAsync(cancellationToken);
        dbContext.PurchaseOrderDetails.RemoveRange(currentDetails);
        dbContext.PurchaseOrderDetails.AddRange(request.Details.Select(detail => CreateDetail(id, detail)));

        await dbContext.SaveChangesAsync(cancellationToken);
        return PurchaseOrderServiceResult<PurchaseOrderResponse>.Success(await MapAsync(order, cancellationToken));
    }

    public async Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> AddDetailAsync(
        Guid id,
        PurchaseOrderLineRequest request,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.PurchaseOrders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(404, "Không tìm thấy đơn nhập hàng.");
        }

        if (order.Status != "Draft")
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(409, "Chỉ có thể sửa đơn nhập hàng ở trạng thái Draft.");
        }

        if (request.ProductId == Guid.Empty || request.Quantity <= 0 || request.UnitPrice < 0)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Sản phẩm cần có mã hợp lệ, số lượng lớn hơn 0 và đơn giá không âm.");
        }

        if (!await dbContext.Products.AnyAsync(
                item => item.Id == request.ProductId && item.IsActive,
                cancellationToken))
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Sản phẩm không tồn tại hoặc đã ngừng hoạt động.");
        }

        if (await dbContext.PurchaseOrderDetails.AnyAsync(
                item => item.PurchaseOrderId == id && item.ProductId == request.ProductId,
                cancellationToken))
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                409,
                "Sản phẩm đã có trong đơn nhập hàng.");
        }

        var detail = CreateDetail(id, request);
        var currentTotal = await dbContext.PurchaseOrderDetails
            .Where(item => item.PurchaseOrderId == id)
            .SumAsync(item => item.TotalPrice, cancellationToken);

        order.TotalAmount = currentTotal + detail.TotalPrice;
        dbContext.PurchaseOrderDetails.Add(detail);
        await dbContext.SaveChangesAsync(cancellationToken);

        return PurchaseOrderServiceResult<PurchaseOrderResponse>.Success(await MapAsync(order, cancellationToken));
    }

    public async Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> RemoveDetailAsync(
        Guid id,
        Guid detailId,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.PurchaseOrders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(404, "Không tìm thấy đơn nhập hàng.");
        }

        if (order.Status != "Draft")
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(409, "Chỉ có thể sửa đơn nhập hàng ở trạng thái Draft.");
        }

        var detail = await dbContext.PurchaseOrderDetails
            .SingleOrDefaultAsync(
                item => item.Id == detailId && item.PurchaseOrderId == id,
                cancellationToken);

        if (detail is null)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(404, "Không tìm thấy sản phẩm trong đơn nhập hàng.");
        }

        if (detail.ReceivedQuantity > 0)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                409,
                "Không thể xóa sản phẩm đã có số lượng nhận hàng.");
        }

        var remainingDetails = dbContext.PurchaseOrderDetails
            .Where(item => item.PurchaseOrderId == id && item.Id != detailId);
        if (!await remainingDetails.AnyAsync(cancellationToken))
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                409,
                "Đơn nhập hàng phải có ít nhất một sản phẩm.");
        }

        order.TotalAmount = await remainingDetails.SumAsync(item => item.TotalPrice, cancellationToken);
        dbContext.PurchaseOrderDetails.Remove(detail);
        await dbContext.SaveChangesAsync(cancellationToken);

        return PurchaseOrderServiceResult<PurchaseOrderResponse>.Success(await MapAsync(order, cancellationToken));
    }

    public async Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> MarkOrderedAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.PurchaseOrders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(404, "Không tìm thấy đơn nhập hàng.");
        }

        if (order.Status != "Draft")
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                409,
                "Chỉ có thể xác nhận đơn nhập hàng ở trạng thái Draft.");
        }

        var hasDetails = await dbContext.PurchaseOrderDetails
            .AnyAsync(item => item.PurchaseOrderId == id, cancellationToken);
        if (!hasDetails)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Đơn nhập hàng phải có ít nhất một sản phẩm trước khi đặt hàng.");
        }

        order.Status = "Ordered";
        await dbContext.SaveChangesAsync(cancellationToken);

        return PurchaseOrderServiceResult<PurchaseOrderResponse>.Success(await MapAsync(order, cancellationToken));
    }

    public async Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> ReceiveAsync(
        Guid id,
        PurchaseOrderReceiveRequest request,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.PurchaseOrders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(404, "Không tìm thấy đơn nhập hàng.");
        }

        if (order.Status != "Ordered")
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                409,
                "Chỉ có thể nhận hàng khi đơn nhập hàng ở trạng thái Ordered.");
        }

        if (request.Details is null || request.Details.Count == 0)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Cần cung cấp danh sách sản phẩm nhận hàng.");
        }

        var detailIds = request.Details.Select(item => item.DetailId).ToArray();
        if (detailIds.Distinct().Count() != detailIds.Length)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Không được gửi trùng sản phẩm trong danh sách nhận hàng.");
        }

        var detailMap = await dbContext.PurchaseOrderDetails
            .Where(item => item.PurchaseOrderId == id)
            .ToDictionaryAsync(item => item.Id, cancellationToken);

        if (detailMap.Count != detailIds.Length || detailIds.Any(detailId => !detailMap.ContainsKey(detailId)))
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Danh sách nhận hàng phải bao gồm đúng các sản phẩm thuộc đơn nhập này.");
        }

        foreach (var item in request.Details)
        {
            if (!detailMap.TryGetValue(item.DetailId, out var detail))
            {
                return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                    400,
                    "Một hoặc nhiều dòng sản phẩm không hợp lệ.");
            }

            if (item.ReceivedQuantity < 0 || item.ReceivedQuantity > detail.Quantity)
            {
                return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                    400,
                    $"Số lượng nhận cho sản phẩm {detail.ProductId} không hợp lệ.");
            }

            if (detail.ReceivedQuantity > 0)
            {
                return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                    409,
                    $"Sản phẩm {detail.ProductId} đã được nhận hàng trước đó.");
            }
        }

        if (request.Details.All(item => item.ReceivedQuantity == 0))
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Cần có ít nhất một sản phẩm với số lượng nhận lớn hơn 0.");
        }

        foreach (var item in request.Details)
        {
            var detail = detailMap[item.DetailId];
            if (item.ReceivedQuantity == 0)
            {
                continue;
            }

            detail.ReceivedQuantity += item.ReceivedQuantity;

            var inventory = await dbContext.Inventories
                .SingleOrDefaultAsync(
                    inventoryItem => inventoryItem.ProductId == detail.ProductId && inventoryItem.WarehouseId == order.WarehouseId,
                    cancellationToken);

            if (inventory is null)
            {
                dbContext.Inventories.Add(new Inventory
                {
                    Id = Guid.NewGuid(),
                    ProductId = detail.ProductId,
                    WarehouseId = order.WarehouseId,
                    Quantity = item.ReceivedQuantity,
                    ReservedQuantity = 0
                });
            }
            else
            {
                inventory.Quantity += item.ReceivedQuantity;
            }

            dbContext.StockTransactions.Add(new StockTransaction
            {
                Id = Guid.NewGuid(),
                ProductId = detail.ProductId,
                WarehouseId = order.WarehouseId,
                TransactionType = "Import",
                Quantity = item.ReceivedQuantity,
                ReferenceId = order.Id,
                Notes = $"Nhập hàng từ đơn {order.Code}",
                CreatedBy = order.CreatedBy,
                CreatedAt = DateTime.UtcNow
            });
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var claimed = await dbContext.PurchaseOrders
            .Where(item => item.Id == id && item.Status == "Ordered")
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(item => item.Status, "Received"),
                cancellationToken);

        if (claimed == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                409,
                "Đơn nhập hàng đã được nhận hoặc không còn ở trạng thái Ordered.");
        }

        order.Status = "Received";
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return PurchaseOrderServiceResult<PurchaseOrderResponse>.Success(await MapAsync(order, cancellationToken));
    }

    private async Task<List<string>> ValidateAsync(PurchaseOrderRequest request, CancellationToken cancellationToken)
    {
        var errors = new List<string>();

        if (request.OrderDate == default)
        {
            errors.Add("Ngày đặt hàng là bắt buộc.");
        }

        if (request.ExpectedDate.HasValue && request.ExpectedDate.Value < request.OrderDate)
        {
            errors.Add("Ngày dự kiến nhận không được trước ngày đặt hàng.");
        }

        if (request.Details is null || request.Details.Count == 0)
        {
            errors.Add("Đơn nhập hàng phải có ít nhất một sản phẩm.");
            return errors;
        }

        if (request.Details.Any(detail => detail.ProductId == Guid.Empty || detail.Quantity <= 0 || detail.UnitPrice < 0))
        {
            errors.Add("Mỗi sản phẩm cần có mã hợp lệ, số lượng lớn hơn 0 và đơn giá không âm.");
        }

        if (request.Details.GroupBy(detail => detail.ProductId).Any(group => group.Count() > 1))
        {
            errors.Add("Không được thêm trùng sản phẩm trong đơn nhập hàng.");
        }

        if (!await dbContext.Suppliers.AnyAsync(item => item.Id == request.SupplierId && item.IsActive, cancellationToken))
        {
            errors.Add("Nhà cung cấp không tồn tại hoặc đã ngừng hoạt động.");
        }

        if (!await dbContext.Warehouses.AnyAsync(item => item.Id == request.WarehouseId && item.IsActive, cancellationToken))
        {
            errors.Add("Kho không tồn tại hoặc đã ngừng hoạt động.");
        }

        var productIds = request.Details.Select(detail => detail.ProductId).Distinct().ToArray();
        var activeProductCount = await dbContext.Products
            .CountAsync(item => productIds.Contains(item.Id) && item.IsActive, cancellationToken);
        if (activeProductCount != productIds.Length)
        {
            errors.Add("Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng hoạt động.");
        }

        return errors;
    }

    private async Task<PurchaseOrderResponse> MapAsync(PurchaseOrder order, CancellationToken cancellationToken)
    {
        var supplierName = await dbContext.Suppliers
            .Where(item => item.Id == order.SupplierId)
            .Select(item => item.Name)
            .SingleAsync(cancellationToken);
        var warehouseName = await dbContext.Warehouses
            .Where(item => item.Id == order.WarehouseId)
            .Select(item => item.Name)
            .SingleAsync(cancellationToken);
        var details = await (
            from detail in dbContext.PurchaseOrderDetails.AsNoTracking()
            join product in dbContext.Products.AsNoTracking() on detail.ProductId equals product.Id
            where detail.PurchaseOrderId == order.Id
            orderby product.Name
            select new PurchaseOrderDetailResponse(
                detail.Id,
                detail.ProductId,
                product.Code,
                product.Name,
                detail.Quantity,
                detail.UnitPrice,
                detail.TotalPrice,
                detail.ReceivedQuantity))
            .ToListAsync(cancellationToken);

        return new PurchaseOrderResponse(
            order.Id,
            order.Code,
            order.SupplierId,
            supplierName,
            order.WarehouseId,
            warehouseName,
            order.OrderDate,
            order.ExpectedDate,
            order.Status,
            order.TotalAmount,
            order.Notes,
            details);
    }

    private static PurchaseOrderDetail CreateDetail(Guid orderId, PurchaseOrderLineRequest request)
    {
        return new PurchaseOrderDetail
        {
            Id = Guid.NewGuid(),
            PurchaseOrderId = orderId,
            ProductId = request.ProductId,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            TotalPrice = request.Quantity * request.UnitPrice,
            ReceivedQuantity = 0
        };
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}