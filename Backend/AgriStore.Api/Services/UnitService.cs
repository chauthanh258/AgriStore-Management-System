using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Units;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AgriStore.Api.Services;

public sealed class UnitService(ApplicationDbContext dbContext) : IUnitService
{
    private const int MaxPageSize = 100;

    public async Task<UnitListResponse> GetPagedAsync(UnitListQuery query, CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var unitsQuery = dbContext.Units.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            unitsQuery = unitsQuery.Where(unit => unit.Name.Contains(search) || unit.Symbol.Contains(search));
        }

        var totalCount = await unitsQuery.CountAsync(cancellationToken);
        var units = await unitsQuery
            .OrderBy(unit => unit.Name)
            .ThenBy(unit => unit.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = units.Select(MapUnit).ToArray();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new UnitListResponse(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<UnitResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var unit = await dbContext.Units
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return unit is null ? null : MapUnit(unit);
    }

    public async Task<UnitServiceResult<UnitResponse>> CreateAsync(
        CreateUnitRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        var symbol = request.Symbol?.Trim();
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(symbol))
        {
            return UnitServiceResult<UnitResponse>.Failure(400, "Tên và ký hiệu đơn vị không được để trống.");
        }

        if (await NameExistsAsync(name, null, cancellationToken))
        {
            return UnitServiceResult<UnitResponse>.Failure(409, "Tên đơn vị đã tồn tại.");
        }

        var unit = new Unit
        {
            Id = Guid.NewGuid(),
            Name = name,
            Symbol = symbol,
            Description = NormalizeOptional(request.Description)
        };

        dbContext.Units.Add(unit);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueNameViolation(exception))
        {
            return UnitServiceResult<UnitResponse>.Failure(409, "Tên đơn vị đã tồn tại.");
        }

        return UnitServiceResult<UnitResponse>.Success(MapUnit(unit));
    }

    public async Task<UnitServiceResult<UnitResponse>> UpdateAsync(
        Guid id,
        UpdateUnitRequest request,
        CancellationToken cancellationToken)
    {
        var unit = await dbContext.Units.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (unit is null)
        {
            return UnitServiceResult<UnitResponse>.Failure(404, "Không tìm thấy đơn vị tính.");
        }

        var name = request.Name?.Trim();
        var symbol = request.Symbol?.Trim();
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(symbol))
        {
            return UnitServiceResult<UnitResponse>.Failure(400, "Tên và ký hiệu đơn vị không được để trống.");
        }

        if (await NameExistsAsync(name, id, cancellationToken))
        {
            return UnitServiceResult<UnitResponse>.Failure(409, "Tên đơn vị đã được sử dụng.");
        }

        unit.Name = name;
        unit.Symbol = symbol;
        unit.Description = NormalizeOptional(request.Description);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueNameViolation(exception))
        {
            return UnitServiceResult<UnitResponse>.Failure(409, "Tên đơn vị đã được sử dụng.");
        }

        return UnitServiceResult<UnitResponse>.Success(MapUnit(unit));
    }

    public async Task<UnitServiceResult<UnitResponse>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var unit = await dbContext.Units.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (unit is null)
        {
            return UnitServiceResult<UnitResponse>.Failure(404, "Không tìm thấy đơn vị tính.");
        }

        if (await dbContext.Products.AnyAsync(product => product.UnitId == id, cancellationToken))
        {
            return UnitServiceResult<UnitResponse>.Failure(409, "Không thể xóa đơn vị đang được sản phẩm sử dụng.");
        }

        dbContext.Units.Remove(unit);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsForeignKeyViolation(exception))
        {
            return UnitServiceResult<UnitResponse>.Failure(409, "Không thể xóa đơn vị đang được sản phẩm sử dụng.");
        }

        return UnitServiceResult<UnitResponse>.Success(MapUnit(unit));
    }

    private Task<bool> NameExistsAsync(string name, Guid? excludedId, CancellationToken cancellationToken)
    {
        return dbContext.Units
            .AsNoTracking()
            .AnyAsync(unit => unit.Name == name && (!excludedId.HasValue || unit.Id != excludedId.Value), cancellationToken);
    }

    private static bool IsUniqueNameViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
            postgresException.SqlState == PostgresErrorCodes.UniqueViolation;
    }

    private static bool IsForeignKeyViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
            postgresException.SqlState == PostgresErrorCodes.ForeignKeyViolation;
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static UnitResponse MapUnit(Unit unit)
    {
        return new UnitResponse(unit.Id, unit.Name, unit.Symbol, unit.Description);
    }
}