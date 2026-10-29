namespace AgriStore.Api.DTOs.Customers;

public sealed record AddressBookQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null);

public sealed record AddressBookItemResponse(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    string ReceiverName,
    string Phone,
    string Province,
    string District,
    string Ward,
    string DetailAddress,
    bool IsDefault);

public sealed record AddressBookResponse(
    IReadOnlyCollection<AddressBookItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);