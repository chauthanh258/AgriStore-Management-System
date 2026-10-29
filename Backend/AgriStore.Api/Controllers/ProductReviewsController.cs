using System.Security.Claims;
using AgriStore.Api.DTOs.ProductReviews;
using AgriStore.Api.Security;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
public sealed class ProductReviewsController(IProductReviewService productReviewService) : ControllerBase
{
    [HttpGet("api/products/{productId:guid}/reviews")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ProductReviewListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductReviewListResponse>> GetByProduct(
        Guid productId,
        [FromQuery] ProductReviewListQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > 100)
        {
            ModelState.AddModelError(
                nameof(query.PageSize),
                "Page phải từ 1 trở lên và PageSize phải nằm trong khoảng 1 đến 100.");
            return ValidationProblem(ModelState);
        }

        var isModerator = User.IsInRole(SystemRoles.Admin) || User.IsInRole(SystemRoles.Manager);
        if (query.IncludePending && !isModerator)
        {
            return Forbid();
        }

        var result = await productReviewService.GetByProductAsync(productId, query, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("api/products/{productId:guid}/reviews")]
    [Authorize(Roles = SystemRoles.Customer)]
    [ProducesResponseType(typeof(ProductReviewResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductReviewResponse>> Create(
        Guid productId,
        [FromBody] CreateProductReviewRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var result = await productReviewService.CreateAsync(productId, userId, request, cancellationToken);
        if (!result.Succeeded)
        {
            return Problem(result, "Không thể tạo đánh giá.");
        }

        return CreatedAtAction(
            nameof(GetByProduct),
            new { productId },
            result.Value);
    }

    [HttpPatch("api/product-reviews/{reviewId:guid}/approval")]
    [Authorize(Policy = AuthorizationPolicies.ManageCatalog)]
    [ProducesResponseType(typeof(ProductReviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductReviewResponse>> SetApproval(
        Guid reviewId,
        [FromBody] SetProductReviewApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var result = await productReviewService.SetApprovalAsync(
            reviewId,
            request.IsApproved,
            cancellationToken);
        return result.Succeeded
            ? Ok(result.Value)
            : Problem(result, "Không thể cập nhật trạng thái duyệt đánh giá.");
    }

    [HttpDelete("api/product-reviews/{reviewId:guid}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid reviewId, CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var isModerator = User.IsInRole(SystemRoles.Admin) || User.IsInRole(SystemRoles.Manager);
        var result = await productReviewService.DeleteAsync(
            reviewId,
            userId,
            isModerator,
            cancellationToken);
        if (!result.Succeeded)
        {
            return Problem(result, "Không thể xóa đánh giá.");
        }

        return NoContent();
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(userIdValue, out userId);
    }

    private ObjectResult Problem<T>(ProductReviewServiceResult<T> result, string title)
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
