using AgriStore.Api.DTOs.Reports;

namespace AgriStore.Api.Services;

public interface IReportService
{
    Task<RevenueReportResponse> GetRevenueAsync(
        RevenueReportQuery query,
        CancellationToken cancellationToken);
    Task<IReadOnlyCollection<TopSellingProductResponse>> GetTopSellingProductsAsync(
        TopSellingProductsQuery query,
        CancellationToken cancellationToken);
    Task<IReadOnlyCollection<InventoryReportItemResponse>> GetInventoryAsync(
        InventoryReportQuery query,
        CancellationToken cancellationToken);
}