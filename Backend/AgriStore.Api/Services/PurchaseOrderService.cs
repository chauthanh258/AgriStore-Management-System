using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Inventories;
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

    public async Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> ReceiveAsync(
        Guid id,
        ReceivePurchaseOrderRequest request,
        Guid? createdBy,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.PurchaseOrders
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (order is null)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                404,
                "Không tìm thấy đơn nhập hàng.");
        }

        if (order.Status is "Cancelled" or "Received")
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                409,
                "Đơn nhập hàng không còn ở trạng thái có thể nhận hàng.");
        }

        if (request.Details is null || request.Details.Count == 0)
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Phiếu nhận hàng phải có ít nhất một sản phẩm.");
        }

        if (request.Details.GroupBy(item => item.ProductId).Any(group => group.Count() > 1))
        {
            return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                400,
                "Không được nhận trùng sản phẩm trong một lần nhận hàng.");
        }

        var details = await dbContext.PurchaseOrderDetails
            .Where(item => item.PurchaseOrderId == id)
            .ToListAsync(cancellationToken);
        var detailByProduct = details.ToDictionary(item => item.ProductId);

        foreach (var receivedLine in request.Details)
        {
            if (!detailByProduct.TryGetValue(receivedLine.ProductId, out var detail))
            {
                return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                    400,
                    $"Sản phẩm {receivedLine.ProductId} không thuộc đơn nhập hàng.");
            }

            if (receivedLine.ReceivedQuantity <= 0 ||
                detail.ReceivedQuantity + receivedLine.ReceivedQuantity > detail.Quantity)
            {
                return PurchaseOrderServiceResult<PurchaseOrderResponse>.Failure(
                    409,
                    $"Số lượng nhận của sản phẩm {receivedLine.ProductId} vượt số lượng còn lại.");
            }
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable,
            cancellationToken);

        var batchId = Guid.NewGuid();
        foreach (var receivedLine in request.Details)
        {
            var detail = detailByProduct[receivedLine.ProductId];
            var inventory = await dbContext.Inventories
                .SingleOrDefaultAsync(
                    item => item.ProductId == detail.ProductId && item.WarehouseId == order.WarehouseId,
                    cancellationToken);

            if (inventory is null)
            {
                inventory = new Inventory
                {
                    Id = Guid.NewGuid(),
                    ProductId = detail.ProductId,
                    WarehouseId = order.WarehouseId,
                    Quantity = 0,
                    ReservedQuantity = 0
                };
                dbContext.Inventories.Add(inventory);
            }

            var quantityBefore = inventory.Quantity;
            inventory.Quantity += receivedLine.ReceivedQuantity;
            detail.ReceivedQuantity += receivedLine.ReceivedQuantity;

            dbContext.StockTransactions.Add(new StockTransaction
            {
                Id = Guid.NewGuid(),
                BatchId = batchId,
                ProductId = detail.ProductId,
                WarehouseId = order.WarehouseId,
                TransactionType = StockTransactionTypes.Import,
                Quantity = receivedLine.ReceivedQuantity,
                QuantityBefore = quantityBefore,
                QuantityAfter = inventory.Quantity,
                ReferenceType = "PurchaseOrder",
                ReferenceId = order.Id,
                Notes = $"Nhận hàng từ đơn nhập {order.Code}",
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            });
        }

        order.Status = details.All(item => item.ReceivedQuantity >= item.Quantity)
            ? "Received"
            : "Ordered";

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return PurchaseOrderServiceResult<PurchaseOrderResponse>.Success(
            await MapAsync(order, cancellationToken));
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