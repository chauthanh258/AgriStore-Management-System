using AgriStore.Api.DTOs.Suppliers;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

/// <summary>API quản lý nhà cung cấp.</summary>
[ApiController]
[Route("api/suppliers")]
public sealed class SuppliersController(ISupplierService supplierService) : ControllerBase
{
    /// <summary>Lấy danh sách nhà cung cấp theo điều kiện tìm kiếm và phân trang.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SupplierListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SupplierListResponse>> GetAll(
        [FromQuery] SupplierListQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await supplierService.GetPagedAsync(query, cancellationToken));
    }

    /// <summary>Lấy thông tin chi tiết một nhà cung cấp.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var supplier = await supplierService.GetByIdAsync(id, cancellationToken);
        return supplier is null ? NotFound() : Ok(supplier);
    }

    /// <summary>Thêm mới nhà cung cấp.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SupplierResponse>> Create(
        CreateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value)
            : Problem(result);
    }

    /// <summary>Cập nhật thông tin nhà cung cấp.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SupplierResponse>> Update(
        Guid id,
        UpdateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.UpdateAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    /// <summary>Thay đổi trạng thái hoạt động của nhà cung cấp.</summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> SetStatus(
        Guid id,
        SupplierStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await supplierService.SetActiveAsync(id, request.IsActive, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    /// <summary>Xóa mềm nhà cung cấp bằng cách chuyển trạng thái hoạt động về false.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await supplierService.DeleteAsync(id, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    private ObjectResult Problem(SupplierServiceResult<SupplierResponse> result)
    {
        var details = new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể hoàn tất yêu cầu quản lý nhà cung cấp.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        };

        return StatusCode(result.StatusCode, details);
    }
}
