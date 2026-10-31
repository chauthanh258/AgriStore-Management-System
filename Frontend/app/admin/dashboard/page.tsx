import Link from "next/link";
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

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="CƠ SỞ DỮ LIỆU AGRISTORE　›　LIVE STREAM ANALYTICS"
        title="Tổng Quan Điều Hành Nông Sản"
        description="Cập nhật vận hành, doanh thu và tồn kho theo thời gian thực."
        action={
          <Link
            href="/admin/reports"
            className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white"
          >
            Báo cáo chi tiết →
          </Link>
        }
      />
      <KpiGrid
        items={[
          {
            label: "Doanh thu hôm nay",
            value: 28650000,
            hint: "+14.2% so với hôm qua",
            tone: "green"
          },
          {
            label: "Đơn hàng hôm nay",
            value: "142 đơn",
            hint: "86 POS · 56 giao hỏa tốc",
            tone: "amber"
          },
          {
            label: "Cảnh báo tồn kho thấp",
            value: "07 SKU",
            hint: "Tạo phiếu nhập →",
            tone: "amber"
          },
          {
            label: "Hạn dùng dưới 3 ngày",
            value: "04 mặt hàng",
            hint: "Cần xử lý / giảm giá",
            tone: "red"
          }
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_.8fr]">
        <Panel title="● Doanh Thu Theo Giờ & So Sánh Chu Kỳ">
          <RevenueChart />
        </Panel>
        <Panel title="Cơ Cấu Danh Mục">
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
        <Panel title="Top Nông Sản Bán Chạy Trong Tuần">
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
        <Panel title="Đơn Chờ Xử Lý Tiếp">
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
        Báo cáo kỳ {revenueReport.fromDate} - {revenueReport.toDate} · Tồn kho
        cảnh báo: {inventory.filter((item) => item.isLowStock).length} SKU
      </p>
    </>
  );
}
