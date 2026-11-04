"use client";

import { useEffect, useState } from "react";
import { AdminModal, IconButton, PageHeader, StatusBadge, DataTable } from "../../../components/admin/admin-ui";
import { purchaseOrders, suppliers as mockSuppliers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import { createSupplier, getSuppliers } from "../../../services/suppliers/supplier.service";
import type { Supplier, SupplierRequest } from "../../../types/api";
import { statusTone } from "../../../components/admin/resource-page";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export default function PurchaseOrdersPage() {
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [supplierItems, setSupplierItems] = useState<Supplier[]>(mockSuppliers.map((supplier) => ({
    id: supplier.id,
    code: supplier.code,
    name: supplier.name,
    contactPerson: supplier.contactName,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    isActive: supplier.isActive
  })));
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<SupplierRequest>({ code: "", name: "", contactPerson: "", phone: "", email: "", address: "" });

  useEffect(() => {
    if (useMock) return;
    getSuppliers({ page: 1, pageSize: 100 })
      .then((result) => setSupplierItems(result.items))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không thể tải nhà cung cấp."));
  }, []);

  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError("Mã và tên nhà cung cấp là bắt buộc.");
      return;
    }
    try {
      if (useMock) {
        setSupplierItems((current) => [...current, { ...form, id: `supplier-${Date.now()}`, isActive: true }]);
      } else {
        const created = await createSupplier(form);
        setSupplierItems((current) => [...current, created]);
      }
      setModalOpen(false);
      setForm({ code: "", name: "", contactPerson: "", phone: "", email: "", address: "" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể tạo nhà cung cấp.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ CHUỖI CUNG ỨNG › NHÀ CUNG CẤP & ĐƠN NHẬP"
        title="Nhà cung cấp & Đơn nhập hàng"
        description="Theo dõi nhà vườn, đơn nhập và nghiệm thu trước khi cộng tồn kho."
        action={tab === "orders" ? <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">＋ Tạo Đơn Nhập Hàng (F1)</button> : <button onClick={() => { setError(""); setModalOpen(true); }} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">＋ Thêm nhà cung cấp</button>}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      <div className="mb-4 flex gap-2 border-b border-[#dfe8dd]">
        <button onClick={() => setTab("orders")} className={`px-4 py-3 text-xs font-bold ${tab === "orders" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}>Đơn nhập hàng</button>
        <button onClick={() => setTab("suppliers")} className={`px-4 py-3 text-xs font-bold ${tab === "suppliers" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}>Nhà cung cấp</button>
      </div>
      {tab === "orders" ? (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          <DataTable headers={["Mã PO / ngày tạo", "Nhà cung cấp", "Kho nhận", "Tổng tiền", "Nghiệm thu", "Trạng thái"]}>
            {purchaseOrders.map((order) => <tr className="hover:bg-[#f8fbf7]" key={order.id}><td className="px-3 py-3"><b>{order.code}</b><small className="block text-[10px] text-[#66736a]">{order.orderDate}</small></td><td className="px-3 py-3">{order.supplierName}</td><td className="px-3 py-3">{order.warehouseName}</td><td className="px-3 py-3">{formatCurrency(order.totalAmount)}</td><td className="px-3 py-3"><StatusBadge tone="amber">300/450 Hộp</StatusBadge></td><td className="px-3 py-3"><StatusBadge tone={statusTone(order.status)}>{order.status}</StatusBadge></td></tr>)}
          </DataTable>
          <p className="mt-3 rounded-lg bg-[#fff9e8] p-3 text-xs text-[#92400e]">API hiện hỗ trợ xem/tạo/sửa/nghiệm thu theo mã PO nhưng chưa có endpoint danh sách PO. Danh sách này giữ mock cho đến khi backend bổ sung GET collection.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          <DataTable headers={["Mã", "Nhà cung cấp", "Người liên hệ", "Điện thoại", "Trạng thái", "Thao tác"]}>
            {supplierItems.map((supplier) => <tr className="hover:bg-[#f8fbf7]" key={supplier.id}><td className="px-3 py-3 font-semibold">{supplier.code}</td><td className="px-3 py-3">{supplier.name}</td><td className="px-3 py-3">{supplier.contactPerson ?? "—"}</td><td className="px-3 py-3">{supplier.phone ?? "—"}</td><td className="px-3 py-3"><StatusBadge>{supplier.isActive ? "Đang hoạt động" : "Tạm khóa"}</StatusBadge></td><td className="px-3 py-3"><IconButton label={`Xem ${supplier.name}`}>→</IconButton></td></tr>)}
          </DataTable>
        </div>
      )}
      {modalOpen && <AdminModal title="Thêm nhà cung cấp" description="Thông tin nhà vườn/hợp tác xã dùng cho đơn nhập hàng." onClose={() => setModalOpen(false)} footer={<><button className="rounded-lg border px-4 py-2 text-xs" onClick={() => setModalOpen(false)}>Hủy</button><button form="supplier-form" className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">Lưu nhà cung cấp</button></>}>
        <form id="supplier-form" onSubmit={(event) => void saveSupplier(event)} className="grid gap-4 sm:grid-cols-2 text-xs">
          <label>Mã NCC<input required className="mt-1 w-full rounded-lg border p-3" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
          <label>Tên nhà cung cấp<input required className="mt-1 w-full rounded-lg border p-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Người liên hệ<input className="mt-1 w-full rounded-lg border p-3" value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></label>
          <label>Số điện thoại<input className="mt-1 w-full rounded-lg border p-3" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Email<input type="email" className="mt-1 w-full rounded-lg border p-3" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Địa chỉ<input className="mt-1 w-full rounded-lg border p-3" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        </form>
      </AdminModal>}
    </>
  );
}
