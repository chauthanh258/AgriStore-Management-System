using AgriStore.Api.DTOs.Warehouses;

namespace AgriStore.Api.Services;

public interface IWarehouseService
{
    Task<IEnumerable<WarehouseResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<WarehouseResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<WarehouseServiceResult<WarehouseResponse>> CreateAsync(
        CreateWarehouseRequest request,
        CancellationToken cancellationToken);
    Task<WarehouseServiceResult<bool>> UpdateAsync(
        Guid id,
        UpdateWarehouseRequest request,
        CancellationToken cancellationToken);
    Task<WarehouseServiceResult<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record WarehouseServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static WarehouseServiceResult<T> Success(T value) =>
        new(value, StatusCodes.Status200OK, []);

    public static WarehouseServiceResult<T> Created(T value) =>
        new(value, StatusCodes.Status201Created, []);

    public static WarehouseServiceResult<T> Failure(int statusCode, params string[] errors) =>
        new(default, statusCode, errors);
}