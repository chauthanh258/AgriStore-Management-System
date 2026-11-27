using AgriStore.Api.DTOs.Warehouses;
using AgriStore.Api.Security;
using Microsoft.AspNetCore.Authorization;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = AuthorizationPolicies.ManageOperations)]
public sealed class WarehousesController(IWarehouseService warehouseService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<WarehouseResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await warehouseService.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WarehouseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await warehouseService.GetByIdAsync(id, cancellationToken);
        if (result == null) return NotFound(new { message = "Không tìm thấy kho hàng." });
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(WarehouseResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateWarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var result = await warehouseService.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value)
            : Problem(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateWarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var result = await warehouseService.UpdateAsync(id, request, cancellationToken);
        return result.Succeeded
            ? Ok(new { message = "Cập nhật thông tin kho thành công." })
            : Problem(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await warehouseService.DeleteAsync(id, cancellationToken);
        return result.Succeeded ? NoContent() : Problem(result);
    }

    private ObjectResult Problem<T>(WarehouseServiceResult<T> result)
    {
        var details = new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể hoàn tất yêu cầu quản lý kho.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        };

        return StatusCode(result.StatusCode, details);
    }
}