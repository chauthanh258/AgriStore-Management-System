using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Auth;

public sealed record RegisterRequest
{
    [Required, MaxLength(200)]
    public required string FullName { get; init; }

    [Required, EmailAddress, MaxLength(256)]
    public required string Email { get; init; }

    [Phone, MaxLength(50)]
    public string? PhoneNumber { get; init; }

    [Required, MinLength(8)]
    public required string Password { get; init; }
}

public sealed record LoginRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public required string Email { get; init; }

    [Required]
    public required string Password { get; init; }
}

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    Guid UserId,
    string Email,
    string FullName,
    IReadOnlyCollection<string> Roles);

public sealed record RegisterResponse(
    Guid UserId,
    string Email,
    string FullName,
    IReadOnlyCollection<string> Roles);