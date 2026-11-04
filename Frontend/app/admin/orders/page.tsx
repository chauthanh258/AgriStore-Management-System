"use client";
import { useEffect, useState } from "react";
import {
  ResourcePage,
  StatusBadge,
  statusTone
} from "../../../components/admin/resource-page";
import { AdminModal } from "../../../components/admin/admin-ui";
import { orders } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import { getAdminOrders } from "../../../services/orders/admin-order.service";
import type { Order } from "../../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
export default function OrdersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apiOrders, setApiOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (useMock) return;
    getAdminOrders({ page: 1, pageSize: 100 })
      .then((result) => setApiOrders(result.items))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không thể tải đơn hàng."));
  }, []);
  const currentOrders = apiOrders ?? orders;
  const selectedOrder = currentOrders.find((order) => order.id === selectedId);
  return (
    <>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
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
      rows={currentOrders.map((order) => ({
        id: order.id,
        search: `${order.code} ${order.status}`,
        status: order.status
      }))}
      columns={[
        (row) => <button className="font-bold text-[#006948] hover:underline" onClick={() => setSelectedId(row.id)}>{currentOrders.find((item) => item.id === row.id)?.code}</button>,
        () => (
          <span>
            Hoàng Thị Lan
            <small className="block text-[10px] text-[#66736a]">VIP Gold</small>
          </span>
        ),
        (row) =>
          currentOrders.find((item) => item.id === row.id)?.details[0]?.productName,
        (row) =>
          formatCurrency(
            currentOrders.find((item) => item.id === row.id)?.totalAmount ?? 0
          ),
        (row) => (
          <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
        )
      ]}
      />
      {selectedOrder && (
        <AdminModal
          title={`Chi tiết đơn ${selectedOrder.code}`}
          description="Kiểm tra sản phẩm, thanh toán và trạng thái xử lý."
          onClose={() => setSelectedId(null)}
          footer={<button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white" onClick={() => setSelectedId(null)}>Đóng</button>}
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between"><span>Trạng thái</span><StatusBadge tone={statusTone(selectedOrder.status)}>{selectedOrder.status}</StatusBadge></div>
            {selectedOrder.details.map((detail) => <div className="flex justify-between rounded-lg bg-[#f2f7ef] p-3" key={detail.productId}><span>{detail.productName}<small className="block text-[#66736a]">x {detail.quantity}</small></span><b>{formatCurrency(detail.totalPrice)}</b></div>)}
            <div className="flex justify-between border-t pt-3 text-base"><b>Tổng cộng</b><b className="text-[#006948]">{formatCurrency(selectedOrder.totalAmount)}</b></div>
          </div>
        </AdminModal>
      )}
    </>
  );
}
