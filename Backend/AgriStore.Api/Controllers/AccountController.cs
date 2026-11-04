using System.Security.Claims;
using AgriStore.Api.DTOs.Customers;
using AgriStore.Api.Security;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/account")]
[Authorize(Roles = SystemRoles.Customer)]
public sealed class AccountController(ICustomerService customerService) : ControllerBase
{
    [HttpGet("addresses")]
    [ProducesResponseType(typeof(IReadOnlyCollection<AddressResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<AddressResponse>>> GetAddresses(
        CancellationToken cancellationToken)
    {
        var customerId = await GetCustomerIdAsync(cancellationToken);
        return customerId is null
            ? NotFound("Tài khoản chưa có hồ sơ khách hàng.")
            : Ok(await customerService.GetAddressesAsync(customerId.Value, cancellationToken));
    }

    [HttpPost("addresses")]
    [ProducesResponseType(typeof(AddressResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AddressResponse>> CreateAddress(
        [FromBody] CreateAddressRequest request,
        CancellationToken cancellationToken)
    {
        var customerId = await GetCustomerIdAsync(cancellationToken);
        if (customerId is null)
        {
            return NotFound("Tài khoản chưa có hồ sơ khách hàng.");
        }

        var address = await customerService.CreateAddressAsync(
            customerId.Value,
            request,
            cancellationToken);

        return address is null
            ? NotFound("Không tìm thấy hồ sơ khách hàng.")
            : CreatedAtAction(nameof(GetAddresses), new { }, address);
    }

    [HttpPut("addresses/{addressId:guid}")]
    [ProducesResponseType(typeof(AddressResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AddressResponse>> UpdateAddress(
        Guid addressId,
        [FromBody] UpdateAddressRequest request,
        CancellationToken cancellationToken)
    {
        var customerId = await GetCustomerIdAsync(cancellationToken);
        if (customerId is null) return NotFound("Tài khoản chưa có hồ sơ khách hàng.");

        var address = await customerService.UpdateAddressAsync(
            customerId.Value, addressId, request, cancellationToken);
        return address is null ? NotFound() : Ok(address);
    }

    [HttpPatch("addresses/{addressId:guid}/default")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetDefaultAddress(
        Guid addressId,
        CancellationToken cancellationToken)
    {
        var customerId = await GetCustomerIdAsync(cancellationToken);
        if (customerId is null) return NotFound("Tài khoản chưa có hồ sơ khách hàng.");

        var updated = await customerService.SetDefaultAddressAsync(
            customerId.Value, addressId, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    private async Task<Guid?> GetCustomerIdAsync(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        return Guid.TryParse(userIdValue, out var userId)
            ? await customerService.GetIdByUserIdAsync(userId, cancellationToken)
            : null;
    }
}
