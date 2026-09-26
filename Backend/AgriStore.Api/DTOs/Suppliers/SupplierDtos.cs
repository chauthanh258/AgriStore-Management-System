using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Suppliers;

/// <summary>Thông tin nhà cung cấp được trả về bởi API.</summary>
public sealed record SupplierResponse(
    Guid Id,
    string Code,
    string Name,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxCode,
    bool IsActive,
    string? Notes);

/// <summary>Tham số lọc và phân trang nhà cung cấp.</summary>
public sealed record SupplierListQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    bool? IsActive = null);

/// <summary>Kết quả phân trang danh sách nhà cung cấp.</summary>
public sealed record SupplierListResponse(
    IReadOnlyCollection<SupplierResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

/// <summary>Thông tin yêu cầu tạo mới nhà cung cấp.</summary>
public sealed record CreateSupplierRequest
{
    [Required, MaxLength(50)]
    public required string Code { get; init; }

    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [MaxLength(200)]
    public string? ContactPerson { get; init; }

    [Phone, MaxLength(50)]
    public string? Phone { get; init; }

    [EmailAddress, MaxLength(256)]
    public string? Email { get; init; }

    [MaxLength(1000)]
    public string? Address { get; init; }

    [MaxLength(50)]
    public string? TaxCode { get; init; }

    [MaxLength(2000)]
    public string? Notes { get; init; }
}

/// <summary>Thông tin yêu cầu cập nhật nhà cung cấp.</summary>
public sealed record UpdateSupplierRequest
{
    [Required, MaxLength(50)]
    public required string Code { get; init; }

    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [MaxLength(200)]
    public string? ContactPerson { get; init; }

    [Phone, MaxLength(50)]
    public string? Phone { get; init; }

    [EmailAddress, MaxLength(256)]
    public string? Email { get; init; }

    [MaxLength(1000)]
    public string? Address { get; init; }

    [MaxLength(50)]
    public string? TaxCode { get; init; }

    [MaxLength(2000)]
    public string? Notes { get; init; }
}

/// <summary>Thông tin yêu cầu thay đổi trạng thái hoạt động của nhà cung cấp.</summary>
public sealed record SupplierStatusRequest(bool IsActive);
