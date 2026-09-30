using AgriStore.Api.DTOs.Units;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

/// <summary>API quản lý đơn vị tính.</summary>
[ApiController]
[Authorize(Roles = "Admin,Manager")]
[Route("api/units")]
public sealed class UnitsController(IUnitService unitService) : ControllerBase
{
    /// <summary>Lấy danh sách đơn vị tính có hỗ trợ tìm kiếm và phân trang.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(UnitListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UnitListResponse>> GetAll(
        [FromQuery] UnitListQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await unitService.GetPagedAsync(query, cancellationToken));
    }

    /// <summary>Lấy thông tin chi tiết một đơn vị tính.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UnitResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UnitResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var unit = await unitService.GetByIdAsync(id, cancellationToken);
        return unit is null ? NotFound() : Ok(unit);
    }

    /// <summary>Thêm mới đơn vị tính.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(UnitResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UnitResponse>> Create(
        CreateUnitRequest request,
        CancellationToken cancellationToken)
    {
        var result = await unitService.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value)
            : Problem(result, "Không thể tạo đơn vị tính.");
    }

    /// <summary>Cập nhật thông tin đơn vị tính.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(UnitResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UnitResponse>> Update(
        Guid id,
        UpdateUnitRequest request,
        CancellationToken cancellationToken)
    {
        var result = await unitService.UpdateAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result, "Không thể cập nhật đơn vị tính.");
    }

    /// <summary>Xóa đơn vị tính nếu chưa được sản phẩm sử dụng.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await unitService.DeleteAsync(id, cancellationToken);
        return result.Succeeded ? NoContent() : Problem(result, "Không thể xóa đơn vị tính.");
    }

    private ObjectResult Problem(UnitServiceResult<UnitResponse> result, string title)
    {
        var details = new ProblemDetails
        {
            Status = result.StatusCode,
            Title = title,
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        };

        return StatusCode(result.StatusCode, details);
    }
}