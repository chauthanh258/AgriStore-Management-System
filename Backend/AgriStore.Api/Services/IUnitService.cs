using AgriStore.Api.DTOs.Units;

namespace AgriStore.Api.Services;

public interface IUnitService
{
    Task<UnitListResponse> GetPagedAsync(UnitListQuery query, CancellationToken cancellationToken);
    Task<UnitResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<UnitServiceResult<UnitResponse>> CreateAsync(CreateUnitRequest request, CancellationToken cancellationToken);
    Task<UnitServiceResult<UnitResponse>> UpdateAsync(Guid id, UpdateUnitRequest request, CancellationToken cancellationToken);
    Task<UnitServiceResult<UnitResponse>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record UnitServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static UnitServiceResult<T> Success(T value) => new(value, 200, []);
    public static UnitServiceResult<T> Failure(int statusCode, params string[] errors) => new(default, statusCode, errors);
}