using System.Data;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Inventories;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class StockTransactionService(ApplicationDbContext dbContext) : IStockTransactionService
{
    private const int MaxPageSize = 100;

    public async Task<StockTransactionServiceResult<StockTransactionResponse>> CreateAsync(
        CreateStockTransactionRequest request,
        Guid? createdBy,
        CancellationToken cancellationToken)
    {
        var validation = await ValidateAsync(request, cancellationToken);
        if (validation.Count > 0)
        {
            return StockTransactionServiceResult<StockTransactionResponse>.Failure(
                StatusCodes.Status400BadRequest,
                validation.ToArray());
        }

        var transactionType = request.TransactionType.Trim();
        var referenceType = Normalize(request.ReferenceType);
        var notes = Normalize(request.Notes);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        if (referenceType is not null && request.ReferenceId.HasValue)
        {
            var existingBatchId = await dbContext.StockTransactions
                .Where(item => item.ReferenceType == referenceType &&
                               item.ReferenceId == request.ReferenceId.Value &&
                               item.TransactionType == transactionType &&
                               item.BatchId.HasValue)
                .Select(item => item.BatchId)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingBatchId.HasValue)
            {
                await transaction.CommitAsync(cancellationToken);
                var existing = await GetByIdAsync(existingBatchId.Value, cancellationToken);
                return StockTransactionServiceResult<StockTransactionResponse>.Success(existing!);
            }
        }

        var productIds = request.Lines.Select(line => line.ProductId).ToArray();
        var inventories = await dbContext.Inventories
            .Where(item => item.WarehouseId == request.WarehouseId && productIds.Contains(item.ProductId))
            .ToListAsync(cancellationToken);
        var inventoryByProduct = inventories.ToDictionary(item => item.ProductId);
        var batchId = Guid.NewGuid();
        var stockTransactions = new List<StockTransaction>(request.Lines.Count);

        foreach (var line in request.Lines)
        {
            if (!inventoryByProduct.TryGetValue(line.ProductId, out var inventory))
            {
                inventory = new Inventory
                {
                    Id = Guid.NewGuid(),
                    ProductId = line.ProductId,
                    WarehouseId = request.WarehouseId,
                    Quantity = 0,
                    ReservedQuantity = 0
                };
                dbContext.Inventories.Add(inventory);
                inventoryByProduct.Add(line.ProductId, inventory);
            }

            var quantityBefore = inventory.Quantity;
            var delta = GetDelta(transactionType, line, quantityBefore);
            var quantityAfter = quantityBefore + delta;

            if (quantityAfter < inventory.ReservedQuantity)
            {
                return StockTransactionServiceResult<StockTransactionResponse>.Failure(
                    StatusCodes.Status409Conflict,
                    $"Sản phẩm {line.ProductId} không đủ tồn khả dụng để thực hiện giao dịch.");
            }

            inventory.Quantity = quantityAfter;
            stockTransactions.Add(new StockTransaction
            {
                Id = Guid.NewGuid(),
                BatchId = batchId,
                ProductId = line.ProductId,
                WarehouseId = request.WarehouseId,
                TransactionType = transactionType,
                Quantity = delta,
                QuantityBefore = quantityBefore,
                QuantityAfter = quantityAfter,
                CountedQuantity = transactionType == StockTransactionTypes.Count
                    ? line.CountedQuantity
                    : null,
                ReferenceType = referenceType,
                ReferenceId = request.ReferenceId,
                Notes = notes,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            });
        }

        dbContext.StockTransactions.AddRange(stockTransactions);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var response = await GetByIdAsync(batchId, cancellationToken);
        return StockTransactionServiceResult<StockTransactionResponse>.Success(response!, 201);
    }

    public async Task<StockTransactionResponse?> GetByIdAsync(
        Guid batchId,
        CancellationToken cancellationToken)
    {
        var rows = await dbContext.StockTransactions
            .AsNoTracking()
            .Where(item => item.BatchId == batchId)
            .OrderBy(item => item.Id)
            .ToListAsync(cancellationToken);

        return rows.Count == 0 ? null : await MapAsync(rows, cancellationToken);
    }

    public async Task<StockTransactionListResponse> GetPagedAsync(
        StockTransactionQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var rowsQuery = dbContext.StockTransactions.AsNoTracking().Where(item => item.BatchId.HasValue);

        if (!string.IsNullOrWhiteSpace(query.TransactionType))
        {
            var transactionType = query.TransactionType.Trim();
            rowsQuery = rowsQuery.Where(item => item.TransactionType == transactionType);
        }

        if (query.ProductId.HasValue)
        {
            rowsQuery = rowsQuery.Where(item => item.ProductId == query.ProductId.Value);
        }

        if (query.WarehouseId.HasValue)
        {
            rowsQuery = rowsQuery.Where(item => item.WarehouseId == query.WarehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.ReferenceType))
        {
            var referenceType = query.ReferenceType.Trim();
            rowsQuery = rowsQuery.Where(item => item.ReferenceType == referenceType);
        }

        if (query.ReferenceId.HasValue)
        {
            rowsQuery = rowsQuery.Where(item => item.ReferenceId == query.ReferenceId.Value);
        }

        if (query.FromDate.HasValue)
        {
            rowsQuery = rowsQuery.Where(item => item.CreatedAt >= query.FromDate.Value.UtcDateTime);
        }

        if (query.ToDate.HasValue)
        {
            rowsQuery = rowsQuery.Where(item => item.CreatedAt < query.ToDate.Value.UtcDateTime);
        }

        var batchIds = await rowsQuery
            .GroupBy(item => item.BatchId!.Value)
            .Select(group => new { BatchId = group.Key, CreatedAt = group.Max(item => item.CreatedAt) })
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.BatchId)
            .ToListAsync(cancellationToken);

        var totalCount = batchIds.Count;
        var selectedBatchIds = batchIds
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => item.BatchId)
            .ToArray();

        var rows = await dbContext.StockTransactions
            .AsNoTracking()
            .Where(item => item.BatchId.HasValue && selectedBatchIds.Contains(item.BatchId.Value))
            .OrderBy(item => item.Id)
            .ToListAsync(cancellationToken);

        var responses = new List<StockTransactionResponse>(selectedBatchIds.Length);
        foreach (var selectedBatchId in selectedBatchIds)
        {
            responses.Add(await MapAsync(
                rows.Where(item => item.BatchId == selectedBatchId).ToList(),
                cancellationToken));
        }

        return new StockTransactionListResponse(
            responses,
            page,
            pageSize,
            totalCount,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    private async Task<List<string>> ValidateAsync(
        CreateStockTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var errors = new List<string>();
        var transactionType = request.TransactionType?.Trim();

        if (transactionType is not StockTransactionTypes.Import and
            not StockTransactionTypes.Export and
            not StockTransactionTypes.Count and
            not StockTransactionTypes.Adjust)
        {
            errors.Add("Loại giao dịch phải là Import, Export, Count hoặc Adjust.");
        }

        if (request.WarehouseId == Guid.Empty ||
            !await dbContext.Warehouses.AnyAsync(
                item => item.Id == request.WarehouseId && item.IsActive,
                cancellationToken))
        {
            errors.Add("Kho không tồn tại hoặc đã ngừng hoạt động.");
        }

        if (request.Lines is null || request.Lines.Count == 0)
        {
            errors.Add("Giao dịch phải có ít nhất một sản phẩm.");
            return errors;
        }

        if (request.Lines.GroupBy(line => line.ProductId).Any(group => group.Count() > 1))
        {
            errors.Add("Không được thêm trùng sản phẩm trong một giao dịch.");
        }

        var productIds = request.Lines.Select(line => line.ProductId).Distinct().ToArray();
        var activeProductCount = await dbContext.Products
            .CountAsync(item => productIds.Contains(item.Id) && item.IsActive, cancellationToken);
        if (activeProductCount != productIds.Length)
        {
            errors.Add("Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng hoạt động.");
        }

        foreach (var line in request.Lines)
        {
            if (transactionType is StockTransactionTypes.Import or StockTransactionTypes.Export)
            {
                if (!line.Quantity.HasValue || line.Quantity <= 0 || line.Adjustment.HasValue || line.CountedQuantity.HasValue)
                {
                    errors.Add("Import và Export yêu cầu Quantity lớn hơn 0 và không nhận Adjustment/CountedQuantity.");
                    break;
                }
            }
            else if (transactionType == StockTransactionTypes.Count)
            {
                if (!line.CountedQuantity.HasValue || line.CountedQuantity < 0 ||
                    line.Quantity != 0 || line.Adjustment.HasValue)
                {
                    errors.Add("Count yêu cầu CountedQuantity không âm và không nhận Quantity/Adjustment.");
                    break;
                }
            }
            else if (transactionType == StockTransactionTypes.Adjust &&
                     (!line.Adjustment.HasValue || line.Adjustment == 0 ||
                      line.Quantity.HasValue || line.CountedQuantity.HasValue))
            {
                errors.Add("Adjust yêu cầu Adjustment khác 0 và không nhận Quantity/CountedQuantity.");
                break;
            }
        }

        var referenceType = Normalize(request.ReferenceType);
        if (request.ReferenceId.HasValue && referenceType is null)
        {
            errors.Add("ReferenceId phải đi kèm ReferenceType.");
        }

        if (referenceType is not null &&
            !string.Equals(referenceType, "Manual", StringComparison.OrdinalIgnoreCase) &&
            !request.ReferenceId.HasValue)
        {
            errors.Add("Giao dịch liên kết phải có ReferenceId.");
        }

        if (transactionType == StockTransactionTypes.Adjust &&
            string.IsNullOrWhiteSpace(request.Notes))
        {
            errors.Add("Điều chỉnh kho bắt buộc phải có ghi chú nêu rõ lý do.");
        }

        return errors;
    }

    private async Task<StockTransactionResponse> MapAsync(
        IReadOnlyCollection<StockTransaction> rows,
        CancellationToken cancellationToken)
    {
        var first = rows.First();
        var warehouseName = await dbContext.Warehouses
            .Where(item => item.Id == first.WarehouseId)
            .Select(item => item.Name)
            .SingleAsync(cancellationToken);
        var productIds = rows.Select(item => item.ProductId).ToArray();
        var products = await dbContext.Products
            .AsNoTracking()
            .Where(item => productIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);

        return new StockTransactionResponse(
            first.BatchId ?? first.Id,
            first.BatchId ?? first.Id,
            first.WarehouseId,
            warehouseName,
            first.TransactionType,
            first.ReferenceType,
            first.ReferenceId,
            first.Notes,
            first.CreatedBy,
            new DateTimeOffset(first.CreatedAt, TimeSpan.Zero),
            rows.Select(row => new StockTransactionLineResponse(
                row.Id,
                row.ProductId,
                products[row.ProductId].Code,
                products[row.ProductId].Name,
                row.Quantity,
                row.QuantityBefore,
                row.QuantityAfter,
                row.CountedQuantity)).ToArray());
    }

    private static decimal GetDelta(
        string transactionType,
        CreateStockTransactionLineRequest line,
        decimal quantityBefore)
    {
        return transactionType switch
        {
            StockTransactionTypes.Import => line.Quantity!.Value,
            StockTransactionTypes.Export => -line.Quantity!.Value,
            StockTransactionTypes.Count => line.CountedQuantity!.Value - quantityBefore,
            StockTransactionTypes.Adjust => line.Adjustment!.Value,
            _ => 0
        };
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}