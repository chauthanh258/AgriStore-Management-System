"use client";
import { useEffect, useState } from "react";
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
export default function ReportsPage() {
  const [report, setReport] = useState<ApiRevenueReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (useMock) return;
    Promise.all([
      getRevenueReport({ fromDate: "2026-10-01", toDate: "2026-10-29", groupBy: "day" }),
      getTopSellingProducts({ fromDate: "2026-10-01", toDate: "2026-10-29", limit: 5 })
    ])
      .then(([revenue, top]) => {
        setReport(revenue);
        setTopProducts(top);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không thể tải báo cáo."));
  }, []);

  const currentReport = report ?? revenueReport;
  return (
    <>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      <PageHeader
        eyebrow="HỆ THỐNG & BÁO CÁO　›　DOANH THU"
        title="Báo Cáo Hoạt Động & Phân Tích Doanh Thu"
        description="Tổng hợp doanh số, lợi nhuận và cơ cấu theo thời gian."
        action={
          <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
            Xuất PDF / Excel
          </button>
        }
      />
      <KpiGrid
        items={[
          {
            label: "Tổng doanh thu tháng",
            value: currentReport.totalRevenue,
            hint: "+18.6% so với tháng trước"
          },
          {
            label: "Lợi nhuận gộp",
            value: 215800000,
            hint: "31.5% Margin",
            tone: "amber"
          },
          {
            label: "Tổng đơn hàng thành công",
            value: currentReport.paidOrderCount,
            hint: "Hủy/đổi dưới 1%",
            tone: "blue"
          },
          {
            label: "Giá trị đơn trung bình",
            value: 319700,
            hint: "POS 285k · Online 365k"
          }
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Diễn Biến Doanh Thu & Lợi Nhuận Theo Ngày">
          <RevenueChart />
        </Panel>
        <Panel title="Bộ lọc báo cáo">
          <div className="grid gap-3 text-xs">
            <label>
              Từ ngày
              <input
                className="mt-1 block w-full rounded border p-2"
                type="date"
                defaultValue="2026-10-01"
              />
            </label>
            <label>
              Đến ngày
              <input
                className="mt-1 block w-full rounded border p-2"
                type="date"
                defaultValue="2026-10-29"
              />
            </label>
            <select className="rounded border p-2">
              <option>Theo ngày</option>
              <option>Theo tháng</option>
            </select>
            <button className="rounded bg-[#006948] p-3 font-bold text-white">
              Áp dụng báo cáo
            </button>
          </div>
        </Panel>
        <Panel title="Top sản phẩm bán chạy">
          <DataTable headers={["Sản phẩm", "Số lượng", "Doanh thu"]}>
            {(topProducts.length ? topProducts : products.slice(0, 5).map((product, index) => ({
              productId: product.id,
              productName: product.name,
              quantitySold: 284 - index * 36,
              revenue: product.sellingPrice * (284 - index * 36)
            }))).map((product) => (
              <tr key={product.productId}>
                <td className="px-3 py-3">{product.productName}</td>
                <td className="px-3 py-3">{product.quantitySold}</td>
                <td className="px-3 py-3">
                  {formatCurrency(product.revenue)}
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </>
  );
}
