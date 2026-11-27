using AgriStore.Api.DTOs.Deliveries;
using AgriStore.Api.Security;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.ManageOperations)]
[Route("api/orders/{orderId:guid}/delivery")]
public sealed class DeliveriesController(IDeliveryService deliveryService) : ControllerBase
{
    /// <summary>Trả về vận đơn của đơn hàng.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(DeliveryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeliveryResponse>> GetByOrderId(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var delivery = await deliveryService.GetByOrderIdAsync(orderId, cancellationToken);
        return delivery is null ? NotFound() : Ok(delivery);
    }

    /// <summary>Tạo vận đơn cho đơn online đã xác nhận.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(DeliveryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeliveryResponse>> Create(
        Guid orderId,
        [FromBody] CreateDeliveryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var delivery = await deliveryService.CreateAsync(orderId, request, cancellationToken);
            return delivery is null
                ? NotFound()
                : CreatedAtAction(nameof(GetByOrderId), new { orderId }, delivery);
        }
        catch (ArgumentException exception)
        {
            return Error(StatusCodes.Status400BadRequest, "Không thể tạo vận đơn.", exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Error(StatusCodes.Status409Conflict, "Không thể tạo vận đơn.", exception.Message);
        }
    }

    /// <summary>Cập nhật trạng thái vận đơn và đồng bộ trạng thái đơn hàng.</summary>
    [HttpPatch("status")]
    [ProducesResponseType(typeof(DeliveryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeliveryResponse>> UpdateStatus(
        Guid orderId,
        [FromBody] UpdateDeliveryStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var delivery = await deliveryService.UpdateStatusAsync(orderId, request, cancellationToken);
            return delivery is null ? NotFound() : Ok(delivery);
        }
        catch (ArgumentException exception)
        {
            return Error(StatusCodes.Status400BadRequest, "Không thể cập nhật trạng thái giao hàng.", exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Error(StatusCodes.Status409Conflict, "Không thể cập nhật trạng thái giao hàng.", exception.Message);
        }
    }

    private ObjectResult Error(int statusCode, string title, string detail) =>
        StatusCode(statusCode, new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = HttpContext.Request.Path
        });
}