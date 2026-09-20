using System.ComponentModel.DataAnnotations;
using System.Runtime.CompilerServices;

namespace AgriStore.Api.DTOs.Customers;

public sealed record CreateCustomerRequest(
    [param: Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [param: StringLength(200)]
    string FullName,

    [param: Required(ErrorMessage = "Số điện thoại là bắt buộc.")]
    [param: StringLength(30)]
    string Phone,

    [param: EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    [param: StringLength(256)]
    string? Email,

    String? Gender,
    DateTime? DateOfBirth,
    String? Notes);

public sealed record UpdateCustomerRequest(
    [param: Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [param: StringLength(200)]
    string FullName,

    [param: Required(ErrorMessage = "Số điện thoại là bắt buộc.")]
    [param: StringLength(30)]
    string Phone,

    [param: EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    [param: StringLength(256)]
    string? Email,

    string? Gender,
    DateTime? DateOfBirth,
    string? Notes);

public sealed record CustomerListQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null);

public sealed record CreateAddressRequest(
    [param: Required(ErrorMessage = "Tên người nhận là bắt buộc.")]
    [param: StringLength(200)]
    string ReceiverName,

    [param: Required(ErrorMessage = "Số điện thoại là bắt buộc.")]
    [param: StringLength(30)]
    string Phone,

    [param: Required]
    [param: StringLength(100)]
    string Province,

    [param: Required]
    [param: StringLength(100)]
    string District,
    
    [param: Required]
    [param: StringLength(100)]
    string Ward,
    
    [param: Required]
    [param: StringLength(500)]
    string DetailAddress,

    bool IsDefault);

public sealed record UpdateAddressRequest(
    [param: Required]
    [param: StringLength(200)]
    string ReceiverName,

    [param: Required]
    [param: StringLength(30)]
    string Phone,

    [param: Required]
    [param: StringLength(100)]
    string Province,

    [param: Required]
    [param: StringLength(100)]
    string District,

    [param: Required]
    [param: StringLength(100)]
    string Ward,

    [param: Required]
    [param: StringLength(500)]
    string DetailAddress);