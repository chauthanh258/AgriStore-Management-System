using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Reports;

/// <summary>Khoảng thời gian và cách nhóm dữ liệu doanh thu.</summary>
public sealed record RevenueReportQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    [param: RegularExpression("(?i)^(day|month)$", ErrorMessage = "GroupBy chỉ nhận day hoặc month.")]
    string GroupBy = "day");

/// <summary>Một kỳ trong báo cáo doanh thu.</summary>
public sealed record RevenuePeriodResponse(
    DateOnly Period,
    decimal Revenue,
    int PaidOrderCount);

/// <summary>Tổng hợp doanh thu trong khoảng thời gian được chọn.</summary>
public sealed record RevenueReportResponse(
    string GroupBy,
    DateOnly FromDate,
    DateOnly ToDate,
    decimal TotalRevenue,
    int PaidOrderCount,
    IReadOnlyCollection<RevenuePeriodResponse> Periods);

/// <summary>Bộ lọc danh sách sản phẩm bán chạy.</summary>
public sealed record TopSellingProductsQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    [param: Range(1, 100)] int Limit = 10);

/// <summary>Số lượng và doanh thu của một sản phẩm đã bán.</summary>
public sealed record TopSellingProductResponse(
    Guid ProductId,
    string ProductCode,
    string ProductName,
    decimal QuantitySold,
    decimal Revenue);

/// <summary>Bộ lọc báo cáo tồn kho.</summary>
public sealed record InventoryReportQuery(
    Guid? WarehouseId = null,
    bool LowStockOnly = false);

/// <summary>Một dòng tồn kho trong báo cáo.</summary>
public sealed record InventoryReportItemResponse(
    Guid ProductId,
    string ProductCode,
    string ProductName,
    Guid WarehouseId,
    string WarehouseName,
    decimal Quantity,
    decimal ReservedQuantity,
    decimal AvailableQuantity,
    decimal MinStockAlert,
    bool IsLowStock);