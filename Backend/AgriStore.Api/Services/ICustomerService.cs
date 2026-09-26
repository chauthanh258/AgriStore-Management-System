using AgriStore.Api.DTOs.Customers;

namespace AgriStore.Api.Services;

public interface ICustomerService
{
    Task<CustomerListResponse> GetPagedAsync(
        CustomerListQuery query,
        CancellationToken cancellationToken
    );
    
    Task<CustomerResponse?> GetByIdAsync(
        Guid Id,
        CancellationToken cancellationToken
    );

    Task<CustomerResponse> CreateAsync(
        CreateCustomerRequest request,
        CancellationToken cancellationToken
    );

    Task<CustomerResponse?> UpdateAsync(
        Guid Id,
        UpdateCustomerRequest request,
        CancellationToken cancellationToken
    );
    Task<bool> DeleteAsync(
        Guid Id,
        CancellationToken cancellationToken
    );

    Task<IReadOnlyCollection<AddressResponse>> GetAddressesAsync(
        Guid customerId,
        CancellationToken cancellationToken
    );

    Task<AddressResponse?> CreateAddressAsync(
        Guid customerId,
        CreateAddressRequest request,
        CancellationToken cancellationToken
    );

    Task<AddressResponse?> UpdateAddressAsync(
    Guid customerId,
    Guid addressId,
    UpdateAddressRequest request,
    CancellationToken cancellationToken);

    Task<bool> SetDefaultAddressAsync(
        Guid customerId,
        Guid addressId,
        CancellationToken cancellationToken
    );

    Task<bool> DeleteAddressAsync(
        Guid customerId,
        Guid addressId,
        CancellationToken cancellationToken
    );
}