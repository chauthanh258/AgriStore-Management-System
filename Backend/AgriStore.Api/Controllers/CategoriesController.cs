using AgriStore.Api.DTOs.Categories;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

/// <summary>API quản lý danh mục sản phẩm.</summary>
[ApiController]
// [Authorize(Roles = "Admin,Manager")]
[Route("api/categories")]
public sealed class CategoriesController(ICategoryService categoryService) : ControllerBase
{
    /// <summary>Lấy danh sách danh mục có hỗ trợ lọc và phân trang.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(CategoryListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoryListResponse>> GetAll(
        [FromQuery] CategoryListQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await categoryService.GetPagedAsync(query, cancellationToken));
    }

    /// <summary>Lấy thông tin chi tiết một danh mục.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var category = await categoryService.GetByIdAsync(id, cancellationToken);
        return category is null ? NotFound() : Ok(category);
    }

    /// <summary>Thêm mới danh mục.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> Create(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await categoryService.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value)
            : Problem(result, "Không thể tạo danh mục.");
    }

    /// <summary>Cập nhật thông tin danh mục.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> Update(
        Guid id,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await categoryService.UpdateAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result, "Không thể cập nhật danh mục.");
    }

    /// <summary>Thay đổi trạng thái hoạt động của danh mục.</summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> SetStatus(
        Guid id,
        CategoryStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await categoryService.SetActiveAsync(id, request.IsActive, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result, "Không thể thay đổi trạng thái danh mục.");
    }

    /// <summary>Xóa mềm danh mục bằng cách chuyển trạng thái hoạt động về false.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await categoryService.DeleteAsync(id, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result, "Không thể xóa danh mục.");
    }

    private ObjectResult Problem(CategoryServiceResult<CategoryResponse> result, string title)
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
