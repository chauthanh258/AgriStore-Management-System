using AgriStore.Api.Data;
using AgriStore.Api.DTOs.Reports;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class ReportService(ApplicationDbContext dbContext) : IReportService
{
    public async Task<RevenueReportResponse> GetRevenueAsync(
        RevenueReportQuery query,
        CancellationToken cancellationToken)
    {
        var (fromDate, toDate, fromUtc, toExclusiveUtc) = ResolveDateRange(
            query.FromDate,
            query.ToDate);
        var groupBy = query.GroupBy.Trim().ToLowerInvariant();

        if (groupBy is not ("day" or "month"))
        {
            throw new ArgumentException("GroupBy chỉ nhận day hoặc month.");
        }

        var paidPayments = dbContext.Payments
            .AsNoTracking()
            .Where(payment => payment.Status == "Paid" &&
                              payment.PaidAt >= fromUtc &&
                              payment.PaidAt < toExclusiveUtc);

        List<RevenuePeriodResponse> periods;

        if (groupBy == "day")
        {
            var dailyTotals = await paidPayments
                .GroupBy(payment => new
                {
                    Year = payment.PaidAt!.Value.Year,
                    Month = payment.PaidAt.Value.Month,
                    Day = payment.PaidAt.Value.Day
                })
                .Select(group => new
                {
                    group.Key.Year,
                    group.Key.Month,
                    group.Key.Day,
                    Revenue = group.Sum(payment => payment.Amount),
                    PaidOrderCount = group.Count()
                })
                .OrderBy(item => item.Year)
                .ThenBy(item => item.Month)
                .ThenBy(item => item.Day)
                .ToListAsync(cancellationToken);

            periods = dailyTotals
                .Select(item => new RevenuePeriodResponse(
                    new DateOnly(item.Year, item.Month, item.Day),
                    item.Revenue,
                    item.PaidOrderCount))
                .ToList();
        }
        else
        {
            var monthlyTotals = await paidPayments
                .GroupBy(payment => new
                {
                    Year = payment.PaidAt!.Value.Year,
                    Month = payment.PaidAt.Value.Month
                })
                .Select(group => new
                {
                    group.Key.Year,
                    group.Key.Month,
                    Revenue = group.Sum(payment => payment.Amount),
                    PaidOrderCount = group.Count()
                })
                .OrderBy(item => item.Year)
                .ThenBy(item => item.Month)
                .ToListAsync(cancellationToken);

            periods = monthlyTotals
                .Select(item => new RevenuePeriodResponse(
                    new DateOnly(item.Year, item.Month, 1),
                    item.Revenue,
                    item.PaidOrderCount))
                .ToList();
        }

        return new RevenueReportResponse(
            groupBy,
            fromDate,
            toDate,
            periods.Sum(item => item.Revenue),
            periods.Sum(item => item.PaidOrderCount),
            periods);
    }

    public async Task<IReadOnlyCollection<TopSellingProductResponse>> GetTopSellingProductsAsync(
        TopSellingProductsQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Limit is < 1 or > 100)
        {
            throw new ArgumentException("Limit phải nằm trong khoảng từ 1 đến 100.");
        }

        var (_, _, fromUtc, toExclusiveUtc) = ResolveDateRange(query.FromDate, query.ToDate);

        return await (
            from detail in dbContext.OrderDetails.AsNoTracking()
            join order in dbContext.Orders.AsNoTracking()
                on detail.OrderId equals order.Id
            join payment in dbContext.Payments.AsNoTracking()
                on order.Id equals payment.OrderId
            join product in dbContext.Products.AsNoTracking()
                on detail.ProductId equals product.Id
            where payment.Status == "Paid" &&
                  payment.PaidAt >= fromUtc &&
                  payment.PaidAt < toExclusiveUtc
            group detail by new
            {
                product.Id,
                product.Code,
                product.Name
            }
            into productSales
            orderby productSales.Sum(detail => detail.Quantity) descending,
                productSales.Sum(detail => detail.TotalPrice) descending
            select new TopSellingProductResponse(
                productSales.Key.Id,
                productSales.Key.Code,
                productSales.Key.Name,
                productSales.Sum(detail => detail.Quantity),
                productSales.Sum(detail => detail.TotalPrice)))
            .Take(query.Limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<InventoryReportItemResponse>> GetInventoryAsync(
        InventoryReportQuery query,
        CancellationToken cancellationToken)
    {
        return await (
            from inventory in dbContext.Inventories.AsNoTracking()
            join product in dbContext.Products.AsNoTracking()
                on inventory.ProductId equals product.Id
            join warehouse in dbContext.Warehouses.AsNoTracking()
                on inventory.WarehouseId equals warehouse.Id
            where (!query.WarehouseId.HasValue || inventory.WarehouseId == query.WarehouseId.Value) &&
                  (!query.LowStockOnly || inventory.Quantity - inventory.ReservedQuantity <= product.MinStockAlert)
            orderby product.Name, warehouse.Name
            select new InventoryReportItemResponse(
                product.Id,
                product.Code,
                product.Name,
                warehouse.Id,
                warehouse.Name,
                inventory.Quantity,
                inventory.ReservedQuantity,
                inventory.Quantity - inventory.ReservedQuantity,
                product.MinStockAlert,
                inventory.Quantity - inventory.ReservedQuantity <= product.MinStockAlert))
            .ToListAsync(cancellationToken);
    }

    private static (DateOnly FromDate, DateOnly ToDate, DateTime FromUtc, DateTime ToExclusiveUtc)
        ResolveDateRange(DateOnly? requestedFrom, DateOnly? requestedTo)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = requestedFrom ?? today.AddDays(-29);
        var toDate = requestedTo ?? today;

        if (fromDate > toDate)
        {
            throw new ArgumentException("FromDate phải nhỏ hơn hoặc bằng ToDate.");
        }

        var fromUtc = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toExclusiveUtc = toDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        return (fromDate, toDate, fromUtc, toExclusiveUtc);
    }
}