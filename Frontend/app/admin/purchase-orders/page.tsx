"use client";
import {
  ResourcePage,
  StatusBadge,
  statusTone
} from "../../../components/admin/resource-page";
import { purchaseOrders } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
export default function PurchaseOrdersPage() {
  return (
    <ResourcePage
      eyebrow="QUẢN TRỊ CHUỖI CUNG ỨNG　›　NHÀ CUNG CẤP & ĐƠN NHẬP"
      title="Quản Lý Đơn Nhập Hàng (Purchase Orders)"
      description="Hợp đồng nhà vườn, giám sát chuỗi logistics và quy chuẩn nghiệm thu."
      action={
        <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
          ＋ Tạo Đơn Nhập Hàng (F1)
        </button>
      }
      headers={[
        "Mã PO / ngày tạo",
        "Nhà cung cấp",
        "Kho nhận",
        "Tổng tiền",
        "Nghiệm thu",
        "Trạng thái"
      ]}
      rows={purchaseOrders.map((order) => ({
        id: order.id,
        search: `${order.code} ${order.supplierName}`,
        status: order.status
      }))}
      columns={[
        (row) => (
          <b>{purchaseOrders.find((item) => item.id === row.id)?.code}</b>
        ),
        (row) =>
          purchaseOrders.find((item) => item.id === row.id)?.supplierName,
        (row) =>
          purchaseOrders.find((item) => item.id === row.id)?.warehouseName,
        (row) =>
          formatCurrency(
            purchaseOrders.find((item) => item.id === row.id)?.totalAmount ?? 0
          ),
        () => <StatusBadge tone="amber">300/450 Hộp</StatusBadge>,
        (row) => (
          <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
        )
      ]}
    />
  );
}
