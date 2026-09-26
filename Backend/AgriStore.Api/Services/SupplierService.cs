using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class SupplierService(ApplicationDbContext dbContext) : ISupplierService
{
    private const int MaxPageSize = 100;

    public async Task<SupplierListResponse> GetPagedAsync(
        SupplierListQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var suppliersQuery = dbContext.Suppliers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            suppliersQuery = suppliersQuery.Where(supplier =>
                supplier.Code.Contains(search) ||
                supplier.Name.Contains(search) ||
                (supplier.ContactPerson != null && supplier.ContactPerson.Contains(search)) ||
                (supplier.Phone != null && supplier.Phone.Contains(search)) ||
                (supplier.Email != null && supplier.Email.Contains(search)) ||
                (supplier.Address != null && supplier.Address.Contains(search)));
        }

        if (query.IsActive.HasValue)
        {
            suppliersQuery = suppliersQuery.Where(supplier => supplier.IsActive == query.IsActive.Value);
        }

        var totalCount = await suppliersQuery.CountAsync(cancellationToken);
        var suppliers = await suppliersQuery
            .OrderBy(supplier => supplier.Name)
            .ThenBy(supplier => supplier.Code)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = suppliers.Select(MapSupplier).ToArray();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new SupplierListResponse(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<SupplierResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var supplier = await dbContext.Suppliers
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return supplier is null ? null : MapSupplier(supplier);
    }

    public async Task<SupplierServiceResult<SupplierResponse>> CreateAsync(
        CreateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(code))
        {
            return SupplierServiceResult<SupplierResponse>.Failure(400, "Mã nhà cung cấp không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return SupplierServiceResult<SupplierResponse>.Failure(400, "Tên nhà cung cấp không được để trống.");
        }

        var codeExists = await dbContext.Suppliers
            .AsNoTracking()
            .AnyAsync(item => item.Code == code, cancellationToken);

        if (codeExists)
        {
            return SupplierServiceResult<SupplierResponse>.Failure(409, "Mã nhà cung cấp đã tồn tại.");
        }

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = name,
            ContactPerson = string.IsNullOrWhiteSpace(request.ContactPerson) ? null : request.ContactPerson.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
            TaxCode = string.IsNullOrWhiteSpace(request.TaxCode) ? null : request.TaxCode.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            IsActive = true
        };

        dbContext.Suppliers.Add(supplier);
        await dbContext.SaveChangesAsync(cancellationToken);

        return SupplierServiceResult<SupplierResponse>.Success(MapSupplier(supplier));
    }

    public async Task<SupplierServiceResult<SupplierResponse>> UpdateAsync(
        Guid id,
        UpdateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();

        if (string.IsNullOrWhiteSpace(code))
        {
            return SupplierServiceResult<SupplierResponse>.Failure(400, "Mã nhà cung cấp không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return SupplierServiceResult<SupplierResponse>.Failure(400, "Tên nhà cung cấp không được để trống.");
        }

        var supplier = await dbContext.Suppliers
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (supplier is null)
        {
            return SupplierServiceResult<SupplierResponse>.Failure(404, "Không tìm thấy nhà cung cấp.");
        }

        var duplicateCodeExists = await dbContext.Suppliers
            .AsNoTracking()
            .AnyAsync(item => item.Id != id && item.Code == code, cancellationToken);

        if (duplicateCodeExists)
        {
            return SupplierServiceResult<SupplierResponse>.Failure(409, "Mã nhà cung cấp đã được sử dụng bởi nhà cung cấp khác.");
        }

        supplier.Code = code;
        supplier.Name = name;
        supplier.ContactPerson = string.IsNullOrWhiteSpace(request.ContactPerson) ? null : request.ContactPerson.Trim();
        supplier.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        supplier.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        supplier.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        supplier.TaxCode = string.IsNullOrWhiteSpace(request.TaxCode) ? null : request.TaxCode.Trim();
        supplier.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);
        return SupplierServiceResult<SupplierResponse>.Success(MapSupplier(supplier));
    }

    public async Task<SupplierServiceResult<SupplierResponse>> SetActiveAsync(
        Guid id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var supplier = await dbContext.Suppliers
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (supplier is null)
        {
            return SupplierServiceResult<SupplierResponse>.Failure(404, "Không tìm thấy nhà cung cấp.");
        }

        supplier.IsActive = isActive;
        await dbContext.SaveChangesAsync(cancellationToken);

        return SupplierServiceResult<SupplierResponse>.Success(MapSupplier(supplier));
    }

    public async Task<SupplierServiceResult<SupplierResponse>> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var supplier = await dbContext.Suppliers
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (supplier is null)
        {
            return SupplierServiceResult<SupplierResponse>.Failure(404, "Không tìm thấy nhà cung cấp.");
        }

        supplier.IsActive = false;
        await dbContext.SaveChangesAsync(cancellationToken);

        return SupplierServiceResult<SupplierResponse>.Success(MapSupplier(supplier));
    }

    private static SupplierResponse MapSupplier(Supplier supplier)
    {
        return new SupplierResponse(
            supplier.Id,
            supplier.Code,
            supplier.Name,
            supplier.ContactPerson,
            supplier.Phone,
            supplier.Email,
            supplier.Address,
            supplier.TaxCode,
            supplier.IsActive,
            supplier.Notes);
    }
}
