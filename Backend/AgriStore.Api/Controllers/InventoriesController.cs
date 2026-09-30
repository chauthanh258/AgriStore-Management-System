using AgriStore.Api.DTOs.Inventories;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
// [Authorize(Roles = "Admin,Manager,Staff")]
[Route("api/inventories")]
public sealed class InventoriesController(IInventoryService inventoryService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(InventoryListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryListResponse>> GetInventories(
        [FromQuery] InventoryListQuery query,
        CancellationToken cancellationToken)
    {
        var result = await inventoryService.GetInventoriesAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("low-stock")]
    [ProducesResponseType(typeof(InventoryListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryListResponse>> GetLowStock(
        [FromQuery] LowStockQuery query,
        CancellationToken cancellationToken)
    {
        var result = await inventoryService.GetLowStockAsync(query, cancellationToken);
        return Ok(result);
    }
}