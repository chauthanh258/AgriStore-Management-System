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