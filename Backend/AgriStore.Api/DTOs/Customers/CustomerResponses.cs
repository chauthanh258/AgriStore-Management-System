namespace AgriStore.Api.DTOs.Customers;

public sealed record AddressResponse(
    Guid Id,
    string ReceiverName,
    string Phone,
    string Province,
    string District,
    string Ward,
    string DetailAddress,
    bool IsDefault);

public sealed record CustomerResponse(
    Guid Id,
    string FullName,
    string Phone,
    string? Email,
    string? Gender,
    DateTime? DateOfBirth,
    int LoyaltyPoints,
    string? Notes,
    IReadOnlyCollection<AddressResponse> Addresses);

public sealed record CustomerListResponse(
    IReadOnlyCollection<CustomerResponse> Items,
    int page,
    int PageSize,
    int TotalCount,
    int TotalPages);