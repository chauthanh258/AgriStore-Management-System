using AgriStore.Api.DTOs.PurchaseOrders;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/purchase-orders")]
public sealed class PurchaseOrdersController(IPurchaseOrderService purchaseOrderService) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseOrderResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var order = await purchaseOrderService.GetByIdAsync(id, cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PurchaseOrderResponse>> Create(
        PurchaseOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await purchaseOrderService.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value)
            : Problem(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PurchaseOrderResponse>> Update(
        Guid id,
        PurchaseOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await purchaseOrderService.UpdateAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPost("{id:guid}/details")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PurchaseOrderResponse>> AddDetail(
        Guid id,
        PurchaseOrderLineRequest request,
        CancellationToken cancellationToken)
    {
        var result = await purchaseOrderService.AddDetailAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpDelete("{id:guid}/details/{detailId:guid}")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PurchaseOrderResponse>> RemoveDetail(
        Guid id,
        Guid detailId,
        CancellationToken cancellationToken)
    {
        var result = await purchaseOrderService.RemoveDetailAsync(id, detailId, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPost("{id:guid}/order")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PurchaseOrderResponse>> MarkOrdered(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await purchaseOrderService.MarkOrderedAsync(id, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPost("{id:guid}/receive")]
    [ProducesResponseType(typeof(PurchaseOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PurchaseOrderResponse>> Receive(
        Guid id,
        PurchaseOrderReceiveRequest request,
        CancellationToken cancellationToken)
    {
        var result = await purchaseOrderService.ReceiveAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    private ObjectResult Problem(PurchaseOrderServiceResult<PurchaseOrderResponse> result)
    {
        var details = new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể hoàn tất yêu cầu quản lý đơn nhập hàng.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        };

        return StatusCode(result.StatusCode, details);
    }
}