namespace AgriStore.Api.DTOs.Users;

/// <summary>Thông tin user an toàn được trả về bởi API quản trị.</summary>
public sealed record UserResponse(
    Guid Id,
    string? UserName,
    string? Email,
    string FullName,
    string? PhoneNumber,
    string? Avatar,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    IReadOnlyCollection<string> Roles);
