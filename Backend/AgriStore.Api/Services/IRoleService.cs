using AgriStore.Api.DTOs.Roles;

namespace AgriStore.Api.Services;

public interface IRoleService
{
    Task<IReadOnlyCollection<RoleResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<RoleResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<RoleServiceResult<RoleResponse>> CreateAsync(CreateRoleRequest request, CancellationToken cancellationToken);
    Task<RoleServiceResult<RoleResponse>> UpdateAsync(Guid id, UpdateRoleRequest request, CancellationToken cancellationToken);
    Task<RoleServiceResult<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record RoleServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static RoleServiceResult<T> Success(T value) => new(value, StatusCodes.Status200OK, []);
    public static RoleServiceResult<T> Created(T value) => new(value, StatusCodes.Status201Created, []);
    public static RoleServiceResult<T> Failure(int statusCode, params string[] errors) => new(default, statusCode, errors);
}