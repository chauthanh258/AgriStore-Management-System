using AgriStore.Api.DTOs.Products;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Manager,Customer")]
[Route("api/products")]
public sealed class ProductsController(IProductService productService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ProductListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProductListResponse>> GetAll(
        [FromQuery] ProductListQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await productService.GetPagedAsync(query, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var product = await productService.GetByIdAsync(id, cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> Create(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var result = await productService.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value)
            : Problem(result, "Không thể tạo sản phẩm.");
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> Update(
        Guid id,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var result = await productService.UpdateAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result, "Không thể cập nhật sản phẩm.");
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductResponse>> SetStatus(
        Guid id,
        ProductStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await productService.SetActiveAsync(id, request.IsActive, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result, "Không thể thay đổi trạng thái sản phẩm.");
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await productService.DeleteAsync(id, cancellationToken);
        return result.Succeeded ? NoContent() : Problem(result, "Không thể ngừng kinh doanh sản phẩm.");
    }

    private ObjectResult Problem(ProductServiceResult<ProductResponse> result, string title)
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