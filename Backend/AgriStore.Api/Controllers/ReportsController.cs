using AgriStore.Api.DTOs.Reports;
using AgriStore.Api.Security;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.ManageOperations)]
[Route("api/reports")]
public sealed class ReportsController(IReportService reportService) : ControllerBase
{
    /// <summary>Báo cáo doanh thu theo ngày hoặc tháng từ các payment đã thanh toán.</summary>
    [HttpGet("revenue")]
    [ProducesResponseType(typeof(RevenueReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RevenueReportResponse>> GetRevenue(
        [FromQuery] RevenueReportQuery query,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await reportService.GetRevenueAsync(query, cancellationToken));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Tham số báo cáo doanh thu không hợp lệ.",
                Detail = exception.Message,
                Status = StatusCodes.Status400BadRequest
            });
        }
    }

    /// <summary>Trả về sản phẩm bán chạy theo số lượng trong khoảng ngày đã chọn.</summary>
    [HttpGet("top-selling-products")]
    [ProducesResponseType(typeof(IReadOnlyCollection<TopSellingProductResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyCollection<TopSellingProductResponse>>> GetTopSellingProducts(
        [FromQuery] TopSellingProductsQuery query,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await reportService.GetTopSellingProductsAsync(query, cancellationToken));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Tham số báo cáo sản phẩm bán chạy không hợp lệ.",
                Detail = exception.Message,
                Status = StatusCodes.Status400BadRequest
            });
        }
    }

    /// <summary>Báo cáo tồn thực tế, hàng giữ đơn và tồn khả dụng theo kho.</summary>
    [HttpGet("inventory")]
    [ProducesResponseType(typeof(IReadOnlyCollection<InventoryReportItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<InventoryReportItemResponse>>> GetInventory(
        [FromQuery] InventoryReportQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await reportService.GetInventoryAsync(query, cancellationToken));
    }
}