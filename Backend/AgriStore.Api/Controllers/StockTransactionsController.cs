using System.Security.Claims;
using AgriStore.Api.DTOs.Inventories;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

/// <summary>API tạo và tra cứu giao dịch kho.</summary>
[ApiController]
[Authorize(Roles = "Admin,Manager,Staff")]
[Route("api/stock-transactions")]
public sealed class StockTransactionsController(IStockTransactionService stockTransactionService) : ControllerBase
{
    /// <summary>Lấy lịch sử phiếu giao dịch kho.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(StockTransactionListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<StockTransactionListResponse>> GetAll(
        [FromQuery] StockTransactionQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await stockTransactionService.GetPagedAsync(query, cancellationToken));
    }

    /// <summary>Lấy chi tiết một phiếu giao dịch kho.</summary>
    [HttpGet("{batchId:guid}")]
    [ProducesResponseType(typeof(StockTransactionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StockTransactionResponse>> GetById(
        Guid batchId,
        CancellationToken cancellationToken)
    {
        var result = await stockTransactionService.GetByIdAsync(batchId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Tạo phiếu giao dịch nhập, xuất, kiểm kê hoặc điều chỉnh.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(StockTransactionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StockTransactionResponse>> Create(
        CreateStockTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await stockTransactionService.CreateAsync(
            request,
            GetCurrentUserId(),
            cancellationToken);

        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { batchId = result.Value!.BatchId }, result.Value)
            : Problem(result);
    }

    private Guid? GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        return Guid.TryParse(userIdValue, out var userId) ? userId : null;
    }

    private ObjectResult Problem(StockTransactionServiceResult<StockTransactionResponse> result)
    {
        var details = new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể hoàn tất giao dịch kho.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        };

        return StatusCode(result.StatusCode, details);
    }
}