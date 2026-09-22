using AgriStore.Api.DTOs.Suppliers;

namespace AgriStore.Api.Services;

public interface ISupplierService
{
    Task<SupplierListResponse> GetPagedAsync(SupplierListQuery query, CancellationToken cancellationToken);
    Task<SupplierResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<SupplierServiceResult<SupplierResponse>> CreateAsync(CreateSupplierRequest request, CancellationToken cancellationToken);
    Task<SupplierServiceResult<SupplierResponse>> UpdateAsync(Guid id, UpdateSupplierRequest request, CancellationToken cancellationToken);
    Task<SupplierServiceResult<SupplierResponse>> SetActiveAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<SupplierServiceResult<SupplierResponse>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record SupplierServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static SupplierServiceResult<T> Success(T value) => new(value, 200, []);
    public static SupplierServiceResult<T> Failure(int statusCode, params string[] errors) => new(default, statusCode, errors);
}
