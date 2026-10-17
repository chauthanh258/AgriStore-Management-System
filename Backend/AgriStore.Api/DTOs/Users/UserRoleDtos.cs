using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Users;

public sealed record UpdateUserRolesRequest
{
    [Required]
    public required IReadOnlyCollection<string> Roles { get; init; }
}

public sealed record UserRolesResponse(Guid UserId, IReadOnlyCollection<string> Roles);