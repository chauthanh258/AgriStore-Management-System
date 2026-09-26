using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Customers;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class CustomerService(ApplicationDbContext dbContext) : ICustomerService
{
    private const int MaxPageSize = 100;

    public async Task<CustomerListResponse> GetPagedAsync(
        CustomerListQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var customersQuery = dbContext.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();

            customersQuery = customersQuery.Where(customer =>
                customer.FullName.Contains(search) ||
                customer.Phone.Contains(search) ||
                (customer.Email != null && customer.Email.Contains(search)));
        }

        var totalCount = await customersQuery.CountAsync(cancellationToken);

        var customers = await customersQuery
            .OrderBy(customer => customer.FullName)
            .ThenBy(customer => customer.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var customerIds = customers.Select(customer => customer.Id).ToList();

        var addresses = await dbContext.Addresses
            .AsNoTracking()
            .Where(address => customerIds.Contains(address.CustomerId))
            .OrderByDescending(address => address.IsDefault)
            .ThenBy(address => address.Id)
            .ToListAsync(cancellationToken);

        var addressGroups = addresses
            .GroupBy(address => address.CustomerId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyCollection<AddressResponse>)
                    group.Select(MapAddress).ToList());

        var items = customers
            .Select(customer => MapCustomer(
                customer,
                addressGroups.GetValueOrDefault(customer.Id, [])))
            .ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new CustomerListResponse(
            items,
            page,
            pageSize,
            totalCount,
            totalPages);
    }

    public async Task<CustomerResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var customer = await dbContext.Customers
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (customer is null)
        {
            return null;
        }

        var addresses = await GetAddressesAsync(id, cancellationToken);
        return MapCustomer(customer, addresses);
    }

    public async Task<CustomerResponse> CreateAsync(
        CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var phone = request.Phone.Trim();

        var phoneExists = await dbContext.Customers
            .AsNoTracking()
            .AnyAsync(customer => customer.Phone == phone, cancellationToken);

        if (phoneExists)
        {
            throw new InvalidOperationException("Số điện thoại đã tồn tại.");
        }

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Phone = phone,
            Email = CleanText(request.Email),
            Gender = CleanText(request.Gender),
            DateOfBirth = request.DateOfBirth?.ToUniversalTime(),
            Notes = CleanText(request.Notes),
            LoyaltyPoints = 0
        };

        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapCustomer(customer, []);
    }

    public async Task<CustomerResponse?> UpdateAsync(
        Guid id,
        UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var customer = await dbContext.Customers
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (customer is null)
        {
            return null;
        }

        var phone = request.Phone.Trim();

        var phoneUsedByAnotherCustomer = await dbContext.Customers
            .AsNoTracking()
            .AnyAsync(item => item.Id != id && item.Phone == phone, cancellationToken);

        if (phoneUsedByAnotherCustomer)
        {
            throw new InvalidOperationException("Số điện thoại đã tồn tại.");
        }

        customer.FullName = request.FullName.Trim();
        customer.Phone = phone;
        customer.Email = CleanText(request.Email);
        customer.Gender = CleanText(request.Gender);
        customer.DateOfBirth = request.DateOfBirth?.ToUniversalTime();
        customer.Notes = CleanText(request.Notes);

        await dbContext.SaveChangesAsync(cancellationToken);

        var addresses = await GetAddressesAsync(id, cancellationToken);
        return MapCustomer(customer, addresses);
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var customer = await dbContext.Customers
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (customer is null)
        {
            return false;
        }

        var hasOrders = await dbContext.Orders
            .AsNoTracking()
            .AnyAsync(order => order.CustomerId == id, cancellationToken);

        if (hasOrders)
        {
            throw new InvalidOperationException(
                "Không thể xóa khách hàng đã có đơn hàng.");
        }

        dbContext.Customers.Remove(customer);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<IReadOnlyCollection<AddressResponse>> GetAddressesAsync(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Addresses
            .AsNoTracking()
            .Where(address => address.CustomerId == customerId)
            .OrderByDescending(address => address.IsDefault)
            .ThenBy(address => address.Id)
            .Select(address => new AddressResponse(
                address.Id,
                address.ReceiverName,
                address.Phone,
                address.Province,
                address.District,
                address.Ward,
                address.DetailAddress,
                address.IsDefault))
            .ToListAsync(cancellationToken);
    }

    public async Task<AddressResponse?> CreateAddressAsync(
        Guid customerId,
        CreateAddressRequest request,
        CancellationToken cancellationToken)
    {
        var customerExists = await dbContext.Customers
            .AsNoTracking()
            .AnyAsync(customer => customer.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return null;
        }

        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var addresses = await dbContext.Addresses
            .Where(address => address.CustomerId == customerId)
            .ToListAsync(cancellationToken);

        // Địa chỉ đầu tiên hoặc địa chỉ người dùng chọn sẽ là mặc định.
        var isDefault = request.IsDefault || addresses.Count == 0;

        if (isDefault)
        {
            foreach (var existingAddress in addresses)
            {
                existingAddress.IsDefault = false;
            }
        }

        var address = new Address
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            ReceiverName = request.ReceiverName.Trim(),
            Phone = request.Phone.Trim(),
            Province = request.Province.Trim(),
            District = request.District.Trim(),
            Ward = request.Ward.Trim(),
            DetailAddress = request.DetailAddress.Trim(),
            IsDefault = isDefault
        };

        dbContext.Addresses.Add(address);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return MapAddress(address);
    }

    public async Task<AddressResponse?> UpdateAddressAsync(
        Guid customerId,
        Guid addressId,
        UpdateAddressRequest request,
        CancellationToken cancellationToken)
    {
        var address = await dbContext.Addresses
            .SingleOrDefaultAsync(
                item => item.Id == addressId && item.CustomerId == customerId,
                cancellationToken);

        if (address is null)
        {
            return null;
        }

        address.ReceiverName = request.ReceiverName.Trim();
        address.Phone = request.Phone.Trim();
        address.Province = request.Province.Trim();
        address.District = request.District.Trim();
        address.Ward = request.Ward.Trim();
        address.DetailAddress = request.DetailAddress.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapAddress(address);
    }

    public async Task<bool> SetDefaultAddressAsync(
        Guid customerId,
        Guid addressId,
        CancellationToken cancellationToken)
    {
        var address = await dbContext.Addresses
            .SingleOrDefaultAsync(
                item => item.Id == addressId && item.CustomerId == customerId,
                cancellationToken);

        if (address is null)
        {
            return false;
        }

        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(cancellationToken);

        var addresses = await dbContext.Addresses
            .Where(item => item.CustomerId == customerId)
            .ToListAsync(cancellationToken);

        foreach (var item in addresses)
        {
            item.IsDefault = item.Id == addressId;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return true;
    }

    public async Task<bool> DeleteAddressAsync(
        Guid customerId,
        Guid addressId,
        CancellationToken cancellationToken)
    {
        var address = await dbContext.Addresses
            .SingleOrDefaultAsync(
                item => item.Id == addressId && item.CustomerId == customerId,
                cancellationToken);

        if (address is null)
        {
            return false;
        }

        dbContext.Addresses.Remove(address);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static CustomerResponse MapCustomer(
        Customer customer,
        IReadOnlyCollection<AddressResponse> addresses)
    {
        return new CustomerResponse(
            customer.Id,
            customer.FullName,
            customer.Phone,
            customer.Email,
            customer.Gender,
            customer.DateOfBirth,
            customer.LoyaltyPoints,
            customer.Notes,
            addresses);
    }

    private static AddressResponse MapAddress(Address address)
    {
        return new AddressResponse(
            address.Id,
            address.ReceiverName,
            address.Phone,
            address.Province,
            address.District,
            address.Ward,
            address.DetailAddress,
            address.IsDefault);
    }

    private static string? CleanText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}