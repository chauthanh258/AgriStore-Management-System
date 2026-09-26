using AgriStore.Api.DTOs.Warehouses;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class WarehousesController(IWarehouseService warehouseService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<WarehouseResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var result = await warehouseService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WarehouseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await warehouseService.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Không tìm thấy kho hàng." });
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(WarehouseResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateWarehouseRequest request)
    {
        var result = await warehouseService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateWarehouseRequest request)
    {
        var success = await warehouseService.UpdateAsync(id, request);
        if (!success) return NotFound(new { message = "Không tìm thấy kho hàng để cập nhật." });
        return Ok(new { message = "Cập nhật thông tin kho thành công." });
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await warehouseService.DeleteAsync(id);
        if (!success) return NotFound(new { message = "Không tìm thấy kho hàng để xóa." });
        return NoContent();
    }
}