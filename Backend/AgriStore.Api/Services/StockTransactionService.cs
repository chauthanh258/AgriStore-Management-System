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

        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken)
            : null;

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
                if (transaction is not null)
                {
                    await transaction.CommitAsync(cancellationToken);
                }

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
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        var response = await GetByIdAsync(batchId, cancellationToken);
        return StockTransactionServiceResult<StockTransactionResponse>.Success(response!, 201);
    }

    public async Task<StockTransactionServiceResult<StockTransferResponse>> TransferAsync(
        CreateStockTransferRequest request,
        Guid? createdBy,
        CancellationToken cancellationToken)
    {
        var validation = ValidateTransferRequest(request);
        if (validation.Count > 0)
        {
            return StockTransactionServiceResult<StockTransferResponse>.Failure(
                StatusCodes.Status400BadRequest,
                validation.ToArray());
        }

        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken)
            : null;

        var existingRows = await dbContext.StockTransactions
            .AsNoTracking()
            .Where(item =>
                item.ReferenceType == "Transfer" &&
                item.ReferenceId == request.TransferId &&
                item.BatchId.HasValue)
            .ToListAsync(cancellationToken);

        if (existingRows.Count > 0)
        {
            var replayResult = await GetTransferReplayResultAsync(
                request,
                existingRows,
                cancellationToken);
            if (transaction is not null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            return replayResult;
        }

        var warehouses = await dbContext.Warehouses
            .Where(item =>
                (item.Id == request.SourceWarehouseId || item.Id == request.DestinationWarehouseId) &&
                item.IsActive)
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        if (warehouses.Count != 2)
        {
            return StockTransactionServiceResult<StockTransferResponse>.Failure(
                StatusCodes.Status400BadRequest,
                "Kho nguồn hoặc kho đích không tồn tại hay đã ngừng hoạt động.");
        }

        var productIds = request.Lines.Select(line => line.ProductId).ToArray();
        var activeProductCount = await dbContext.Products
            .CountAsync(item => productIds.Contains(item.Id) && item.IsActive, cancellationToken);
        if (activeProductCount != productIds.Length)
        {
            return StockTransactionServiceResult<StockTransferResponse>.Failure(
                StatusCodes.Status400BadRequest,
                "Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng hoạt động.");
        }

        var sourceInventories = await dbContext.Inventories
            .Where(item =>
                item.WarehouseId == request.SourceWarehouseId &&
                productIds.Contains(item.ProductId))
            .ToDictionaryAsync(item => item.ProductId, cancellationToken);
        var destinationInventories = await dbContext.Inventories
            .Where(item =>
                item.WarehouseId == request.DestinationWarehouseId &&
                productIds.Contains(item.ProductId))
            .ToDictionaryAsync(item => item.ProductId, cancellationToken);

        foreach (var line in request.Lines)
        {
            if (!sourceInventories.TryGetValue(line.ProductId, out var sourceInventory) ||
                sourceInventory.Quantity - line.Quantity < sourceInventory.ReservedQuantity)
            {
                return StockTransactionServiceResult<StockTransferResponse>.Failure(
                    StatusCodes.Status409Conflict,
                    $"Sản phẩm {line.ProductId} không đủ tồn khả dụng tại kho nguồn.");
            }
        }

        var transferId = request.TransferId;
        var outboundBatchId = Guid.NewGuid();
        var inboundBatchId = Guid.NewGuid();
        var referenceType = "Transfer";
        var notes = Normalize(request.Notes);
        var outboundTransactions = new List<StockTransaction>(request.Lines.Count);
        var inboundTransactions = new List<StockTransaction>(request.Lines.Count);

        foreach (var line in request.Lines)
        {
            var sourceInventory = sourceInventories[line.ProductId];
            var sourceBefore = sourceInventory.Quantity;
            var sourceAfter = sourceBefore - line.Quantity;
            sourceInventory.Quantity = sourceAfter;

            if (!destinationInventories.TryGetValue(line.ProductId, out var destinationInventory))
            {
                destinationInventory = new Inventory
                {
                    Id = Guid.NewGuid(),
                    ProductId = line.ProductId,
                    WarehouseId = request.DestinationWarehouseId,
                    Quantity = 0m,
                    ReservedQuantity = 0m
                };
                dbContext.Inventories.Add(destinationInventory);
                destinationInventories.Add(line.ProductId, destinationInventory);
            }

            var destinationBefore = destinationInventory.Quantity;
            var destinationAfter = destinationBefore + line.Quantity;
            destinationInventory.Quantity = destinationAfter;

            outboundTransactions.Add(new StockTransaction
            {
                Id = Guid.NewGuid(),
                BatchId = outboundBatchId,
                ProductId = line.ProductId,
                WarehouseId = request.SourceWarehouseId,
                TransactionType = StockTransactionTypes.Export,
                Quantity = -line.Quantity,
                QuantityBefore = sourceBefore,
                QuantityAfter = sourceAfter,
                ReferenceType = referenceType,
                ReferenceId = transferId,
                Notes = notes,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            });
            inboundTransactions.Add(new StockTransaction
            {
                Id = Guid.NewGuid(),
                BatchId = inboundBatchId,
                ProductId = line.ProductId,
                WarehouseId = request.DestinationWarehouseId,
                TransactionType = StockTransactionTypes.Import,
                Quantity = line.Quantity,
                QuantityBefore = destinationBefore,
                QuantityAfter = destinationAfter,
                ReferenceType = referenceType,
                ReferenceId = transferId,
                Notes = notes,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            });
        }

        dbContext.StockTransactions.AddRange(outboundTransactions);
        dbContext.StockTransactions.AddRange(inboundTransactions);
        await dbContext.SaveChangesAsync(cancellationToken);

        var outbound = await GetByIdAsync(outboundBatchId, cancellationToken);
        var inbound = await GetByIdAsync(inboundBatchId, cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return StockTransactionServiceResult<StockTransferResponse>.Success(
            new StockTransferResponse(transferId, outbound!, inbound!),
            StatusCodes.Status201Created);
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
            var requestedType = query.TransactionType.Trim();
            var transactionType = requestedType.ToUpperInvariant() switch
            {
                "IMPORT" => StockTransactionTypes.Import,
                "EXPORT" => StockTransactionTypes.Export,
                "COUNT" => StockTransactionTypes.Count,
                "ADJUST" => StockTransactionTypes.Adjust,
                _ => requestedType
            };
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

        var totalCount = await rowsQuery
            .Select(item => item.BatchId!.Value)
            .Distinct()
            .CountAsync(cancellationToken);

        var skip = ((long)page - 1) * pageSize;
        var selectedBatchIds = skip > int.MaxValue
            ? Array.Empty<Guid>()
            : await rowsQuery
                .GroupBy(item => item.BatchId!.Value)
                .Select(group => new { BatchId = group.Key, CreatedAt = group.Max(item => item.CreatedAt) })
                .OrderByDescending(item => item.CreatedAt)
                .ThenByDescending(item => item.BatchId)
                .Skip((int)skip)
                .Take(pageSize)
                .Select(item => item.BatchId)
                .ToArrayAsync(cancellationToken);

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
                    line.Quantity.HasValue || line.Adjustment.HasValue)
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

    private static List<string> ValidateTransferRequest(CreateStockTransferRequest request)
    {
        var errors = new List<string>();
        if (request.TransferId == Guid.Empty)
        {
            errors.Add("TransferId không được để trống.");
        }

        if (request.SourceWarehouseId == Guid.Empty || request.DestinationWarehouseId == Guid.Empty)
        {
            errors.Add("Kho nguồn và kho đích là bắt buộc.");
        }

        if (request.SourceWarehouseId == request.DestinationWarehouseId)
        {
            errors.Add("Kho nguồn và kho đích phải khác nhau.");
        }

        if (request.Lines is null || request.Lines.Count == 0)
        {
            errors.Add("Giao dịch chuyển kho phải có ít nhất một sản phẩm.");
            return errors;
        }

        if (request.Lines.Any(line =>
                line.ProductId == Guid.Empty ||
                line.Quantity <= 0m ||
                decimal.Round(line.Quantity, 3) != line.Quantity))
        {
            errors.Add("Mỗi dòng chuyển kho phải có sản phẩm hợp lệ và số lượng lớn hơn 0, tối đa 3 chữ số thập phân.");
        }

        if (request.Lines.GroupBy(line => line.ProductId).Any(group => group.Count() > 1))
        {
            errors.Add("Không được thêm trùng sản phẩm trong một giao dịch chuyển kho.");
        }

        if (request.Notes?.Length > 2000)
        {
            errors.Add("Ghi chú chuyển kho không được vượt quá 2000 ký tự.");
        }

        return errors;
    }

    private async Task<StockTransactionServiceResult<StockTransferResponse>> GetTransferReplayResultAsync(
        CreateStockTransferRequest request,
        IReadOnlyCollection<StockTransaction> existingRows,
        CancellationToken cancellationToken)
    {
        var outboundRows = existingRows
            .Where(item => item.TransactionType == StockTransactionTypes.Export)
            .ToArray();
        var inboundRows = existingRows
            .Where(item => item.TransactionType == StockTransactionTypes.Import)
            .ToArray();
        var expectedLines = request.Lines.ToDictionary(line => line.ProductId);
        var expectedNotes = Normalize(request.Notes);
        var matchesRequest =
            outboundRows.Length == expectedLines.Count &&
            inboundRows.Length == expectedLines.Count &&
            outboundRows.All(row =>
                row.WarehouseId == request.SourceWarehouseId &&
                expectedLines.TryGetValue(row.ProductId, out var line) &&
                row.Quantity == -line.Quantity &&
                row.Notes == expectedNotes) &&
            inboundRows.All(row =>
                row.WarehouseId == request.DestinationWarehouseId &&
                expectedLines.TryGetValue(row.ProductId, out var line) &&
                row.Quantity == line.Quantity &&
                row.Notes == expectedNotes) &&
            outboundRows.Select(row => row.BatchId).Distinct().Count() == 1 &&
            inboundRows.Select(row => row.BatchId).Distinct().Count() == 1 &&
            outboundRows[0].BatchId != inboundRows[0].BatchId;

        if (!matchesRequest)
        {
            return StockTransactionServiceResult<StockTransferResponse>.Failure(
                StatusCodes.Status409Conflict,
                "TransferId đã được sử dụng cho một yêu cầu chuyển kho khác hoặc giao dịch không toàn vẹn.");
        }

        var outbound = await GetByIdAsync(outboundRows[0].BatchId!.Value, cancellationToken);
        var inbound = await GetByIdAsync(inboundRows[0].BatchId!.Value, cancellationToken);
        if (outbound is null || inbound is null)
        {
            return StockTransactionServiceResult<StockTransferResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Không thể khôi phục đầy đủ giao dịch chuyển kho đã tồn tại.");
        }

        return StockTransactionServiceResult<StockTransferResponse>.Success(
            new StockTransferResponse(request.TransferId, outbound, inbound),
            StatusCodes.Status200OK);
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