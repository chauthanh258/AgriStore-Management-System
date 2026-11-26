"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PageHeader,
  KpiGrid,
  Panel,
  DataTable,
  StatusBadge
} from "../../../components/admin/admin-ui";
import { RevenueChart } from "../../../components/admin/revenue-chart";
import { inventory, orders, revenueReport } from "../../../data/admin-mock";
import { products } from "../../../data/mock";
import { formatCurrency } from "../../../lib/formatters";
import { getRevenueReport } from "../../../services/reports/report.service";
import type { RevenueReport as ApiRevenueReport } from "../../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdminDashboardPage() {
  const [report, setReport] = useState<ApiRevenueReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!useMock);

  useEffect(() => {
    if (useMock) return;
    const today = new Date();
    getRevenueReport({
      fromDate: localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      toDate: localDate(today),
      groupBy: "day"
    })
      .then(setReport)
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "Không thể tải doanh thu.")
      )
      .finally(() => setLoading(false));
  }, []);

  const currentReport = useMock ? revenueReport : report;
  return (
    <>
      <PageHeader
        eyebrow="CƠ SỞ DỮ LIỆU AGRISTORE › LIVE STREAM ANALYTICS"
        title="Tổng quan điều hành nông sản"
        description="Theo dõi doanh thu, đơn hàng và tồn kho trong kỳ hiện tại."
        action={
          <Link
            href="/admin/reports"
            className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white"
          >
            Báo cáo chi tiết →
          </Link>
        }
      />
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      <KpiGrid
        items={[
          {
            label: "Doanh thu trong kỳ",
            value: currentReport?.totalRevenue ?? "—",
            hint: currentReport ? `${currentReport.fromDate} — ${currentReport.toDate}` : loading ? "Đang tải dữ liệu..." : "Chưa có dữ liệu",
            tone: "green"
          },
          {
            label: "Đơn hàng đã thanh toán",
            value: currentReport ? `${currentReport.paidOrderCount} đơn` : "—",
            hint: "Trong kỳ báo cáo",
            tone: "blue"
          },
          {
            label: "Cảnh báo tồn kho thấp",
            value: `${inventory.filter((item) => item.isLowStock).length} SKU`,
            hint: "Cần kiểm tra tồn kho",
            tone: "amber"
          },
          {
            label: "Đơn chờ xử lý",
            value: `${orders.filter((order) => ["Pending", "Processing"].includes(order.status)).length} đơn`,
            hint: "Theo dữ liệu vận hành",
            tone: "amber"
          }
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_.8fr]">
        <Panel title="Doanh thu theo kỳ">
          {loading ? (
            <p className="grid h-64 place-items-center text-xs text-[#66736a]">Đang tải báo cáo doanh thu...</p>
          ) : currentReport ? (
            <RevenueChart data={currentReport.periods} />
          ) : (
            <p className="grid h-64 place-items-center text-xs text-[#66736a]">Không có dữ liệu doanh thu để hiển thị.</p>
          )}
        </Panel>
        <Panel title="Cơ cấu danh mục">
          <div className="grid place-items-center py-10">
            <div className="grid h-40 w-40 place-items-center rounded-full border-[25px] border-[#006948] text-center">
              <b>
                100%<small className="block text-[9px] font-normal">TỔNG</small>
              </b>
            </div>
            <p className="mt-4 text-xs">
              ● Rau củ hữu cơ　42%
              <br />● Trái cây cao cấp　31%
              <br />● Gạo & Hạt　15%
            </p>
          </div>
        </Panel>
        <Panel title="Top nông sản bán chạy trong tuần">
          <DataTable
            headers={["Nông sản & SKU", "Đã bán", "Doanh thu", "Tăng trưởng"]}
          >
            {products.slice(0, 4).map((product, index) => (
              <tr key={product.id}>
                <td className="px-3 py-3">
                  <b>{product.name}</b>
                  <small className="block text-[10px] text-[#66736a]">
                    {product.code}
                  </small>
                </td>
                <td className="px-3 py-3">{284 - index * 36}</td>
                <td className="px-3 py-3">
                  {formatCurrency(product.sellingPrice * (284 - index * 36))}
                </td>
                <td className="px-3 py-3 text-[#006948]">
                  +{28 - index * 4}.4%
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
        <Panel title="Đơn chờ xử lý tiếp">
          <div className="space-y-2">
            {orders.slice(0, 3).map((order) => (
              <div
                className="flex items-center justify-between rounded-lg bg-[#f2f7ef] p-3 text-xs"
                key={order.id}
              >
                <span>
                  <b>{order.code}</b>
                  <small className="block text-[#66736a]">
                    {order.details[0]?.productName}
                  </small>
                </span>
                <StatusBadge tone="amber">{order.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <p className="mt-4 text-[10px] text-[#66736a]">
        {useMock ? "Dữ liệu minh họa" : "Dữ liệu từ báo cáo doanh thu"} · Tồn kho cảnh báo: {inventory.filter((item) => item.isLowStock).length} SKU
      </p>
    </>
  );
}
