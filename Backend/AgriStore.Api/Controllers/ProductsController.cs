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
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductListResponse>> GetAll(
        [FromQuery] ProductListQuery query,
        CancellationToken cancellationToken)
    {
        if (query.MinPrice < 0)
        {
            ModelState.AddModelError(nameof(query.MinPrice), "Giá tối thiểu không được âm.");
        }

        if (query.MaxPrice < 0)
        {
            ModelState.AddModelError(nameof(query.MaxPrice), "Giá tối đa không được âm.");
        }

        if (query.MinPrice.HasValue && query.MaxPrice.HasValue && query.MinPrice > query.MaxPrice)
        {
            ModelState.AddModelError(nameof(query.MaxPrice), "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.");
        }

        var sortBy = query.SortBy?.Trim();
        if (!string.Equals(sortBy, "name", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(sortBy, "code", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(sortBy, "sellingPrice", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(sortBy, "createdAt", StringComparison.OrdinalIgnoreCase))
        {
            ModelState.AddModelError(nameof(query.SortBy), "Trường sắp xếp phải là name, code, sellingPrice hoặc createdAt.");
        }

        if (!string.Equals(query.SortDirection, "asc", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(query.SortDirection, "desc", StringComparison.OrdinalIgnoreCase))
        {
            ModelState.AddModelError(nameof(query.SortDirection), "Chiều sắp xếp phải là asc hoặc desc.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

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

    [HttpPost("{id:guid}/images")]
    [Authorize(Roles = "Admin,Manager")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ProductImageStorage.MaxFileSizeBytes + 64 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = ProductImageStorage.MaxFileSizeBytes + 64 * 1024)]
    [ProducesResponseType(typeof(ProductImageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductImageResponse>> UploadImage(
        Guid id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var result = await productService.UploadImageAsync(id, file, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id }, result.Value)
            : Problem(result, "Không thể tải ảnh sản phẩm lên.");
    }

    [HttpPatch("{id:guid}/images/{imageId:guid}/main")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(ProductImageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductImageResponse>> SetMainImage(
        Guid id,
        Guid imageId,
        CancellationToken cancellationToken)
    {
        var result = await productService.SetMainImageAsync(id, imageId, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result, "Không thể đặt ảnh chính.");
    }

    [HttpDelete("{id:guid}/images/{imageId:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteImage(Guid id, Guid imageId, CancellationToken cancellationToken)
    {
        var result = await productService.DeleteImageAsync(id, imageId, cancellationToken);
        return result.Succeeded ? NoContent() : Problem(result, "Không thể xóa ảnh sản phẩm.");
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

    private ObjectResult Problem<T>(ProductServiceResult<T> result, string title)
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