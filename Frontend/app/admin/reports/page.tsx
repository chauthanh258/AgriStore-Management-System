"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  KpiGrid,
  PageHeader,
  Panel,
  DataTable
} from "../../../components/admin/admin-ui";
import { RevenueChart } from "../../../components/admin/revenue-chart";
import { revenueReport } from "../../../data/admin-mock";
import { products } from "../../../data/mock";
import { formatCurrency } from "../../../lib/formatters";
import { getRevenueReport, getTopSellingProducts } from "../../../services/reports/report.service";
import type { RevenueReport as ApiRevenueReport, TopSellingProduct } from "../../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

type ReportFilters = {
  fromDate: string;
  toDate: string;
  groupBy: "day" | "month";
};

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultFilters(): ReportFilters {
  const today = new Date();
  return {
    fromDate: localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    toDate: localDate(today),
    groupBy: "day" as const
  };
}

export default function ReportsPage() {
  const [report, setReport] = useState<ApiRevenueReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!useMock);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  useEffect(() => {
    if (useMock) return;
    let active = true;
    Promise.all([
      getRevenueReport(appliedFilters),
      getTopSellingProducts({
        fromDate: appliedFilters.fromDate,
        toDate: appliedFilters.toDate,
        limit: 5
      })
    ])
      .then(([revenue, top]) => {
        if (!active) return;
        setReport(revenue);
        setTopProducts(top);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải báo cáo.");
          setReport(null);
          setTopProducts([]);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [appliedFilters]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.fromDate > filters.toDate) {
      setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }
    setError("");
    setLoading(!useMock);
    setAppliedFilters({ ...filters });
  }

  const currentReport = useMock ? revenueReport : report;
  const displayedProducts = useMock
    ? products.slice(0, 5).map((product, index) => ({
        productId: product.id,
        productName: product.name,
        quantitySold: 284 - index * 36,
        revenue: product.sellingPrice * (284 - index * 36)
      }))
    : topProducts;

  return (
    <>
      <PageHeader
        eyebrow="HỆ THỐNG & BÁO CÁO › DOANH THU"
        title="Báo cáo doanh thu"
        description="Theo dõi doanh thu, số đơn đã thanh toán và sản phẩm bán chạy theo thời gian."
        action={
          <button disabled className="cursor-not-allowed rounded-lg border border-[#dfe8dd] px-4 py-2 text-xs font-bold text-[#66736a]" title="Chưa có API xuất báo cáo">
            Xuất PDF / Excel
          </button>
        }
      />
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      <KpiGrid
        items={[
          {
            label: "Tổng doanh thu",
            value: currentReport?.totalRevenue ?? "—",
            hint: currentReport ? `${currentReport.fromDate} — ${currentReport.toDate}` : loading ? "Đang tải dữ liệu..." : "Chưa có dữ liệu",
            tone: "green"
          },
          {
            label: "Đơn đã thanh toán",
            value: currentReport?.paidOrderCount ?? "—",
            hint: "Trong khoảng thời gian đã chọn",
            tone: "blue"
          },
          {
            label: "Lợi nhuận gộp",
            value: "—",
            hint: "API hiện chưa cung cấp dữ liệu lợi nhuận",
            tone: "amber"
          },
          {
            label: "Giá trị đơn trung bình",
            value: currentReport && currentReport.paidOrderCount > 0
              ? currentReport.totalRevenue / currentReport.paidOrderCount
              : "—",
            hint: "Tính từ doanh thu / số đơn đã thanh toán"
          }
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Diễn biến doanh thu theo kỳ">
          {loading ? (
            <p className="grid h-64 place-items-center text-xs text-[#66736a]">Đang tải báo cáo...</p>
          ) : currentReport ? (
            <RevenueChart data={currentReport.periods} />
          ) : (
            <p className="grid h-64 place-items-center text-xs text-[#66736a]">Không có dữ liệu doanh thu trong kỳ này.</p>
          )}
        </Panel>
        <Panel title="Bộ lọc báo cáo">
          <form onSubmit={applyFilters} className="grid gap-3 text-xs">
            <label>
              Từ ngày
              <input
                className="mt-1 block w-full rounded border p-2"
                type="date"
                required
                value={filters.fromDate}
                onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
              />
            </label>
            <label>
              Đến ngày
              <input
                className="mt-1 block w-full rounded border p-2"
                type="date"
                required
                value={filters.toDate}
                onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
              />
            </label>
            <label>
              Nhóm dữ liệu
              <select
                className="block w-full rounded border p-2"
                value={filters.groupBy}
                onChange={(event) => setFilters((current) => ({ ...current, groupBy: event.target.value === "month" ? "month" : "day" }))}
              >
                <option value="day">Theo ngày</option>
                <option value="month">Theo tháng</option>
              </select>
            </label>
            <button disabled={loading} className="rounded bg-[#006948] p-3 font-bold text-white disabled:opacity-50">
              {loading ? "Đang tải..." : "Áp dụng báo cáo"}
            </button>
            {useMock && <p className="text-[10px] text-[#66736a]">Dữ liệu minh họa; bộ lọc áp dụng khi kết nối API.</p>}
          </form>
        </Panel>
        <Panel title="Top sản phẩm bán chạy">
          {displayedProducts.length > 0 ? (
            <DataTable headers={["Sản phẩm", "Số lượng", "Doanh thu"]}>
              {displayedProducts.map((product) => (
                <tr key={product.productId}>
                  <td className="px-3 py-3">{product.productName}</td>
                  <td className="px-3 py-3">{product.quantitySold}</td>
                  <td className="px-3 py-3">{formatCurrency(product.revenue)}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <p className="py-8 text-center text-xs text-[#66736a]">{loading ? "Đang tải sản phẩm..." : "Không có sản phẩm bán trong kỳ này."}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
