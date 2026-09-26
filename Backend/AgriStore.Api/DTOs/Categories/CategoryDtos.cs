using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Categories;

/// <summary>Thông tin danh mục được trả về bởi API.</summary>
public sealed record CategoryResponse(
    Guid Id,
    string Name,
    string? Description,
    Guid? ParentId,
    string? Image,
    bool IsActive,
    int SortOrder);

/// <summary>Tham số lọc và phân trang danh mục.</summary>
public sealed record CategoryListQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    Guid? ParentId = null,
    bool? IsActive = null);

/// <summary>Kết quả phân trang danh sách danh mục.</summary>
public sealed record CategoryListResponse(
    IReadOnlyCollection<CategoryResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

/// <summary>Thông tin yêu cầu tạo mới danh mục.</summary>
public sealed record CreateCategoryRequest
{
    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [MaxLength(1000)]
    public string? Description { get; init; }

    public Guid? ParentId { get; init; }

    [MaxLength(500)]
    public string? Image { get; init; }

    public bool IsActive { get; init; } = true;

    [Range(0, int.MaxValue)]
    public int SortOrder { get; init; }
}

/// <summary>Thông tin yêu cầu cập nhật danh mục.</summary>
public sealed record UpdateCategoryRequest
{
    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [MaxLength(1000)]
    public string? Description { get; init; }

    public Guid? ParentId { get; init; }

    [MaxLength(500)]
    public string? Image { get; init; }

    public bool IsActive { get; init; } = true;

    [Range(0, int.MaxValue)]
    public int SortOrder { get; init; }
}

/// <summary>Thông tin yêu cầu thay đổi trạng thái hoạt động của danh mục.</summary>
public sealed record CategoryStatusRequest(bool IsActive);
