using AgriStore.Api.DTOs.Payments;
using AgriStore.Api.Security;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.ManageOperations)]
[Route("api/orders/{orderId:guid}/payment")]
public sealed class PaymentsController(IPaymentService paymentService) : ControllerBase
{
    /// <summary>Trả về giao dịch thanh toán của đơn hàng.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> GetByOrderId(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var payment = await paymentService.GetByOrderIdAsync(orderId, cancellationToken);
        return payment is null ? NotFound() : Ok(payment);
    }

    /// <summary>Tạo giao dịch tiền mặt, chuyển khoản mô phỏng hoặc COD cho đơn hàng.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> Create(
        Guid orderId,
        [FromBody] CreatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var payment = await paymentService.CreateAsync(orderId, request, cancellationToken);
            return payment is null
                ? NotFound()
                : CreatedAtAction(nameof(GetByOrderId), new { orderId }, payment);
        }
        catch (ArgumentException exception)
        {
            return Error(StatusCodes.Status400BadRequest, "Không thể tạo thanh toán.", exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Error(StatusCodes.Status409Conflict, "Không thể tạo thanh toán.", exception.Message);
        }
    }

    /// <summary>Cập nhật trạng thái giao dịch thanh toán mô phỏng.</summary>
    [HttpPatch("status")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> UpdateStatus(
        Guid orderId,
        [FromBody] UpdatePaymentStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var payment = await paymentService.UpdateStatusAsync(orderId, request, cancellationToken);
            return payment is null ? NotFound() : Ok(payment);
        }
        catch (ArgumentException exception)
        {
            return Error(StatusCodes.Status400BadRequest, "Không thể cập nhật thanh toán.", exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            return Error(StatusCodes.Status409Conflict, "Không thể cập nhật thanh toán.", exception.Message);
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