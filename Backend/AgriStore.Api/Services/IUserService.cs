using AgriStore.Api.DTOs.Users;

namespace AgriStore.Api.Services;

public interface IUserService
{
    Task<UserListResponse> GetPagedAsync(UserListQuery query, CancellationToken cancellationToken);
    Task<UserResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<UserServiceResult<UserResponse>> UpdateAsync(
        Guid id,
        UpdateUserRequest request,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken);
    Task<UserServiceResult<UserResponse>> SetActiveAsync(
        Guid id,
        bool isActive,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken);
    Task<UserServiceResult<UserRolesResponse>> GetRolesAsync(Guid id, CancellationToken cancellationToken);
    Task<UserServiceResult<UserRolesResponse>> ReplaceRolesAsync(
        Guid id,
        IReadOnlyCollection<string> roles,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken);
    Task<UserServiceResult<UserRolesResponse>> AddRoleAsync(
        Guid id,
        string roleName,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken);
    Task<UserServiceResult<UserRolesResponse>> RemoveRoleAsync(
        Guid id,
        string roleName,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken);
}

public sealed record UserServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static UserServiceResult<T> Success(T value) => new(value, 200, []);
    public static UserServiceResult<T> Failure(int statusCode, params string[] errors) => new(default, statusCode, errors);
}
