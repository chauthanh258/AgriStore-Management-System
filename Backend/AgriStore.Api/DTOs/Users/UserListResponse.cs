namespace AgriStore.Api.DTOs.Users;

/// <summary>Kết quả phân trang danh sách user.</summary>
public sealed record UserListResponse(
    IReadOnlyCollection<UserResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

/// <summary>Tham số lọc và phân trang danh sách user.</summary>
public sealed record UserListQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    bool? IsActive = null);

/// <summary>Dữ liệu yêu cầu thay đổi trạng thái hoạt động của user.</summary>
public sealed record UserStatusRequest(bool IsActive);
