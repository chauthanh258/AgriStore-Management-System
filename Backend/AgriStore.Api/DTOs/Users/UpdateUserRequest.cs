using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Users;

/// <summary>Dữ liệu được phép cập nhật cho một user.</summary>
public sealed record UpdateUserRequest
{
    /// <summary>Họ tên hiển thị của user.</summary>
    [Required, MaxLength(200)]
    public required string FullName { get; init; }

    /// <summary>Email đăng nhập/liên hệ của user.</summary>
    [Required, EmailAddress, MaxLength(256)]
    public required string Email { get; init; }

    /// <summary>Số điện thoại của user.</summary>
    [Phone, MaxLength(50)]
    public string? PhoneNumber { get; init; }

    /// <summary>Đường dẫn avatar của user.</summary>
    [MaxLength(500)]
    public string? Avatar { get; init; }
}
