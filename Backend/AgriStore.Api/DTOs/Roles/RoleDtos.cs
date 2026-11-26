using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Roles;

public sealed record CreateRoleRequest
{
    [Required, MaxLength(100)]
    public required string Name { get; init; }

    [MaxLength(500)]
    public string? Description { get; init; }
}

public sealed record UpdateRoleRequest
{
    [Required, MaxLength(100)]
    public required string Name { get; init; }

    [MaxLength(500)]
    public string? Description { get; init; }
}

public sealed record RoleResponse(
    Guid Id,
    string Name,
    string? Description,
    DateTimeOffset CreatedAt,
    int UserCount,
    bool IsSystemRole);

public sealed record RoleListResponse(IReadOnlyCollection<RoleResponse> Items);

public sealed record PermissionResponse(
    string Code,
    string Name,
    string? Description,
    string Module,
    string Action);

public sealed record RolePermissionsResponse(
    Guid RoleId,
    string RoleName,
    IReadOnlyCollection<string> PermissionCodes,
    bool IsSystemRole,
    bool HasFullAccess);

public sealed record UpdateRolePermissionsRequest
{
    [Required]
    public required IReadOnlyCollection<string> PermissionCodes { get; init; }
}