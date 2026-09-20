using AgriStore.Api.DTOs.Customers;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/customers")]
// [Authorize(Roles = "Admin,Manager,Staff")]
public sealed class CustomersController(ICustomerService customerService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(CustomerListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CustomerListResponse>> GetAll(
        [FromQuery] CustomerListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await customerService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var customer = await customerService.GetByIdAsync(id, cancellationToken);

        return customer is null ? NotFound() : Ok(customer);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerResponse>> Create(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var customer = await customerService.CreateAsync(request, cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = customer.Id },
                customer);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Không thể tạo khách hàng.",
                Detail = exception.Message,
                Status = StatusCodes.Status409Conflict
            });
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerResponse>> Update(
        Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var customer = await customerService.UpdateAsync(
                id,
                request,
                cancellationToken);

            return customer is null ? NotFound() : Ok(customer);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Không thể cập nhật khách hàng.",
                Detail = exception.Message,
                Status = StatusCodes.Status409Conflict
            });
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await customerService.DeleteAsync(id, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Không thể xóa khách hàng.",
                Detail = exception.Message,
                Status = StatusCodes.Status409Conflict
            });
        }
    }

    [HttpGet("{customerId:guid}/addresses")]
    [ProducesResponseType(typeof(IReadOnlyCollection<AddressResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<AddressResponse>>> GetAddresses(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var customer = await customerService.GetByIdAsync(customerId, cancellationToken);

        return customer is null ? NotFound() : Ok(customer.Addresses);
    }

    [HttpPost("{customerId:guid}/addresses")]
    [ProducesResponseType(typeof(AddressResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AddressResponse>> CreateAddress(
        Guid customerId,
        [FromBody] CreateAddressRequest request,
        CancellationToken cancellationToken)
    {
        var address = await customerService.CreateAddressAsync(
            customerId,
            request,
            cancellationToken);

        if (address is null)
        {
            return NotFound();
        }

        return CreatedAtAction(
            nameof(GetAddresses),
            new { customerId },
            address);
    }

    [HttpPut("{customerId:guid}/addresses/{addressId:guid}")]
    [ProducesResponseType(typeof(AddressResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AddressResponse>> UpdateAddress(
        Guid customerId,
        Guid addressId,
        [FromBody] UpdateAddressRequest request,
        CancellationToken cancellationToken)
    {
        var address = await customerService.UpdateAddressAsync(
            customerId,
            addressId,
            request,
            cancellationToken);

        return address is null ? NotFound() : Ok(address);
    }

    [HttpPatch("{customerId:guid}/addresses/{addressId:guid}/default")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetDefaultAddress(
        Guid customerId,
        Guid addressId,
        CancellationToken cancellationToken)
    {
        var updated = await customerService.SetDefaultAddressAsync(
            customerId,
            addressId,
            cancellationToken);

        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{customerId:guid}/addresses/{addressId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAddress(
        Guid customerId,
        Guid addressId,
        CancellationToken cancellationToken)
    {
        var deleted = await customerService.DeleteAddressAsync(
            customerId,
            addressId,
            cancellationToken);

        return deleted ? NoContent() : NotFound();
    }
}