"use client";
import {
  ResourcePage,
  StatusBadge,
  statusTone
} from "../../../components/admin/resource-page";
import { orders } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
export default function OrdersPage() {
  return (
    <ResourcePage
      eyebrow="BÁN HÀNG　›　OMNICHANNEL"
      title="Quản lý Đơn hàng Nông sản"
      description="Theo dõi và xử lý đơn hàng POS tại quầy và online giao hỏa tốc."
      headers={[
        "Mã đơn / ngày",
        "Khách hàng",
        "Nông sản tiêu biểu",
        "Tổng tiền",
        "Trạng thái"
      ]}
      rows={orders.map((order) => ({
        id: order.id,
        search: `${order.code} ${order.status}`,
        status: order.status
      }))}
      columns={[
        (row) => <b>{orders.find((item) => item.id === row.id)?.code}</b>,
        () => (
          <span>
            Hoàng Thị Lan
            <small className="block text-[10px] text-[#66736a]">VIP Gold</small>
          </span>
        ),
        (row) =>
          orders.find((item) => item.id === row.id)?.details[0]?.productName,
        (row) =>
          formatCurrency(
            orders.find((item) => item.id === row.id)?.totalAmount ?? 0
          ),
        (row) => (
          <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
        )
      ]}
    />
  );
}
