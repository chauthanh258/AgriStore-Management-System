"use client";

import { useEffect, useState } from "react";
import { AdminModal, IconButton, PageHeader, StatusBadge, DataTable } from "../../../components/admin/admin-ui";
import { purchaseOrders, suppliers as mockSuppliers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import { getPurchaseOrders } from "../../../services/purchase-orders/purchase-order.service";
import { createSupplier, getSuppliers, setSupplierStatus, updateSupplier } from "../../../services/suppliers/supplier.service";
import type { Supplier, SupplierRequest } from "../../../types/api";
import type { PurchaseOrderListItem } from "../../../types/purchase-orders";
import { statusTone } from "../../../components/admin/resource-page";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Power } from "lucide-react";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
const pageSize = 10;
const supplierPageSize = 20;
const orderStatuses = ["Draft", "Ordered", "Received", "Cancelled"];
const emptySupplierForm: SupplierRequest = {
  code: "",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  taxCode: "",
  notes: ""
};

const mockSupplierItems: Supplier[] = mockSuppliers.map((supplier) => ({
  id: supplier.id,
  code: supplier.code,
  name: supplier.name,
  contactPerson: supplier.contactName,
  phone: supplier.phone,
  email: supplier.email,
  address: supplier.address,
  isActive: supplier.isActive
}));

const mockPurchaseOrderItems: PurchaseOrderListItem[] = purchaseOrders.map((order) => ({
  id: order.id,
  code: order.code,
  supplierName: order.supplierName,
  warehouseName: order.warehouseName,
  orderDate: order.orderDate,
  status: order.status,
  totalAmount: order.totalAmount
}));

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Draft: "Nháp",
    Ordered: "Đã đặt",
    Received: "Đã nhận",
    Cancelled: "Đã hủy"
  };
  return labels[status] ?? status;
}

export default function PurchaseOrdersPage() {
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [mockSupplierItemsState, setMockSupplierItemsState] = useState<Supplier[]>(mockSupplierItems);
  const [supplierPage, setSupplierPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [ordersReloadCount, setOrdersReloadCount] = useState(0);
  const [supplierReloadCount, setSupplierReloadCount] = useState(0);
  const [supplierResult, setSupplierResult] = useState<{
    requestKey: string;
    items: Supplier[];
    totalPages: number;
    error: string;
  } | null>(null);
  const [ordersResult, setOrdersResult] = useState<{
    requestKey: string;
    items: PurchaseOrderListItem[];
    totalPages: number;
    error: string;
  } | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierRequest>(emptySupplierForm);
  const supplierRequestKey = `${supplierPage}:${supplierReloadCount}`;
  const orderRequestKey = `${page}:${statusFilter}:${ordersReloadCount}`;

  useEffect(() => {
    if (useMock) return;
    let active = true;
    getSuppliers({ page: supplierPage, pageSize: supplierPageSize })
      .then((result) => {
        if (!active) return;
        setSupplierResult({
          requestKey: supplierRequestKey,
          items: result.items,
          totalPages: result.totalPages,
          error: ""
        });
      })
      .catch((loadError: unknown) => {
        if (active) {
          setSupplierResult({
            requestKey: supplierRequestKey,
            items: [],
            totalPages: 0,
            error: loadError instanceof Error ? loadError.message : "Không thể tải nhà cung cấp."
          });
        }
      });

    return () => {
      active = false;
    };
  }, [supplierPage, supplierReloadCount, supplierRequestKey]);

  useEffect(() => {
    if (useMock) return;
    let active = true;
    getPurchaseOrders({ page, pageSize, status: statusFilter || undefined })
      .then((result) => {
        if (!active) return;
        setOrdersResult({
          requestKey: orderRequestKey,
          items: result.items,
          totalPages: result.totalPages,
          error: ""
        });
      })
      .catch((loadError: unknown) => {
        if (active) {
          setOrdersResult({
            requestKey: orderRequestKey,
            items: [],
            totalPages: 0,
            error: loadError instanceof Error ? loadError.message : "Không thể tải danh sách đơn nhập."
          });
        }
      });

    return () => {
      active = false;
    };
  }, [page, statusFilter, ordersReloadCount, orderRequestKey]);

  const filteredMockOrders = mockPurchaseOrderItems.filter(
    (order) => !statusFilter || order.status === statusFilter
  );
  const startIndex = (page - 1) * pageSize;
  const supplierStartIndex = (supplierPage - 1) * supplierPageSize;
  const supplierItems = useMock
    ? mockSupplierItemsState.slice(supplierStartIndex, supplierStartIndex + supplierPageSize)
    : supplierResult?.requestKey === supplierRequestKey ? supplierResult.items : [];
  const supplierTotalPages = useMock
    ? Math.ceil(mockSupplierItemsState.length / supplierPageSize)
    : supplierResult?.requestKey === supplierRequestKey ? supplierResult.totalPages : 0;
  const purchaseOrderItems = useMock
    ? filteredMockOrders.slice(startIndex, startIndex + pageSize)
    : ordersResult?.requestKey === orderRequestKey ? ordersResult.items : [];
  const totalPages = useMock
    ? Math.ceil(filteredMockOrders.length / pageSize)
    : ordersResult?.requestKey === orderRequestKey ? ordersResult.totalPages : 0;
  const ordersLoading = !useMock && ordersResult?.requestKey !== orderRequestKey;
  const ordersError = !useMock && ordersResult?.requestKey === orderRequestKey
    ? ordersResult.error
    : "";
  const supplierLoading = !useMock && supplierResult?.requestKey !== supplierRequestKey;
  const supplierLoadError = !useMock && supplierResult?.requestKey === supplierRequestKey
    ? supplierResult.error
    : "";

  function openCreateSupplier() {
    setEditingSupplier(null);
    setForm(emptySupplierForm);
    setSupplierError("");
    setModalOpen(true);
  }

  function openEditSupplier(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      taxCode: supplier.taxCode ?? "",
      notes: supplier.notes ?? ""
    });
    setSupplierError("");
    setModalOpen(true);
  }

  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setSupplierError("Mã và tên nhà cung cấp là bắt buộc.");
      return;
    }
    setSavingSupplier(true);
    setSupplierError("");
    try {
      const request: SupplierRequest = {
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        contactPerson: form.contactPerson?.trim(),
        phone: form.phone?.trim(),
        email: form.email?.trim(),
        address: form.address?.trim(),
        taxCode: form.taxCode?.trim(),
        notes: form.notes?.trim()
      };

      if (editingSupplier) {
        if (useMock) {
          const updated = { ...editingSupplier, ...request };
          setMockSupplierItemsState((current) => current.map((supplier) => supplier.id === updated.id ? updated : supplier));
        } else {
          await updateSupplier(editingSupplier.id, request);
          setSupplierReloadCount((current) => current + 1);
        }
      } else {
        if (useMock) {
          const created = { ...request, id: `supplier-${Date.now()}`, isActive: true };
          setMockSupplierItemsState((current) => [...current, created]);
          setSupplierPage(1);
        } else {
          await createSupplier(request);
          setSupplierPage(1);
          setSupplierReloadCount((current) => current + 1);
        }
      }
      setModalOpen(false);
      setForm(emptySupplierForm);
    } catch (saveError: unknown) {
      setSupplierError(saveError instanceof Error ? saveError.message : "Không thể lưu nhà cung cấp.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function toggleSupplierStatus(supplier: Supplier) {
    setSupplierError("");
    try {
      if (useMock) {
        const updated = { ...supplier, isActive: !supplier.isActive };
        setMockSupplierItemsState((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        await setSupplierStatus(supplier.id, !supplier.isActive);
        setSupplierReloadCount((current) => current + 1);
      }
    } catch (statusError: unknown) {
      setSupplierError(statusError instanceof Error ? statusError.message : "Không thể cập nhật trạng thái nhà cung cấp.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ CHUỖI CUNG ỨNG › NHÀ CUNG CẤP & ĐƠN NHẬP"
        title="Nhà cung cấp & Đơn nhập hàng"
        description="Theo dõi nhà vườn, đơn nhập và nghiệm thu trước khi cộng tồn kho."
        action={tab === "suppliers" ? <button onClick={openCreateSupplier} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white flex items-center gap-1"><Plus className="h-4 w-4" /> Thêm nhà cung cấp</button> : undefined}
      />
      <div className="mb-4 flex gap-2 border-b border-[#dfe8dd]">
        <button onClick={() => setTab("orders")} className={`px-4 py-3 text-xs font-bold ${tab === "orders" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}>Đơn nhập hàng</button>
        <button onClick={() => setTab("suppliers")} className={`px-4 py-3 text-xs font-bold ${tab === "suppliers" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}>Nhà cung cấp</button>
      </div>
      {tab === "orders" ? (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#536156]">
              Lọc trạng thái
              <select
                className="rounded-lg border border-[#dfe8dd] bg-white px-3 py-2 text-xs"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                {orderStatuses.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
              </select>
            </label>
            <span className="text-xs text-[#66736a]">{totalPages ? `Trang ${page}/${totalPages}` : "Không có trang dữ liệu"}</span>
          </div>
          {ordersError && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{ordersError}<button className="ml-2 font-bold underline" onClick={() => setOrdersReloadCount((current) => current + 1)}>Thử lại</button></div>}
          {ordersLoading ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Đang tải danh sách đơn nhập...</p>
          ) : purchaseOrderItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Không có đơn nhập phù hợp với trạng thái đã chọn.</p>
          ) : (
            <DataTable headers={["Mã PO / ngày tạo", "Nhà cung cấp", "Kho nhận", "Tổng tiền", "Trạng thái"]}>
              {purchaseOrderItems.map((order) => <tr className="hover:bg-[#f8fbf7]" key={order.id}>
                <td className="px-3 py-3"><b>{order.code}</b><small className="block text-[10px] text-[#66736a]">{new Date(order.orderDate).toLocaleDateString("vi-VN")}</small></td>
                <td className="px-3 py-3">{order.supplierName}</td>
                <td className="px-3 py-3">{order.warehouseName}</td>
                <td className="px-3 py-3">{formatCurrency(order.totalAmount)}</td>
                <td className="px-3 py-3"><StatusBadge tone={statusTone(order.status)}>{getStatusLabel(order.status)}</StatusBadge></td>
              </tr>)}
            </DataTable>
          )}
          <div className="mt-4 flex items-center justify-end gap-3 text-xs">
            <button
              className="rounded border border-[#dfe8dd] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={ordersLoading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Trang trước
            </button>
            <button
              className="rounded border border-[#dfe8dd] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={ordersLoading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          {(supplierError || supplierLoadError) && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
            {supplierError || supplierLoadError}
            {supplierLoadError && <button className="ml-2 font-bold underline" onClick={() => setSupplierReloadCount((current) => current + 1)}>Thử lại</button>}
          </div>}
          {supplierLoading ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Đang tải nhà cung cấp...</p>
          ) : supplierItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Chưa có nhà cung cấp nào.</p>
          ) : (
            <DataTable headers={["Mã", "Nhà cung cấp", "Người liên hệ", "Điện thoại", "Trạng thái", "Thao tác"]}>
              {supplierItems.map((supplier) => <tr className="hover:bg-[#f8fbf7]" key={supplier.id}>
                <td className="px-3 py-3 font-semibold">{supplier.code}</td>
                <td className="px-3 py-3">{supplier.name}</td>
                <td className="px-3 py-3">{supplier.contactPerson ?? "—"}</td>
                <td className="px-3 py-3">{supplier.phone ?? "—"}</td>
                <td className="px-3 py-3"><StatusBadge tone={supplier.isActive ? "green" : "gray"}>{supplier.isActive ? "Đang hoạt động" : "Tạm khóa"}</StatusBadge></td>
                <td className="flex gap-2 px-3 py-3">
                  <IconButton label={`Sửa ${supplier.name}`} onClick={() => openEditSupplier(supplier)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label={supplier.isActive ? `Tạm khóa ${supplier.name}` : `Kích hoạt ${supplier.name}`} onClick={() => void toggleSupplierStatus(supplier)}>
                    {supplier.isActive ? <Power className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </IconButton>
                </td>
              </tr>)}
            </DataTable>
          )}
          <div className="mt-4 flex items-center justify-end gap-3 text-xs">
            <span className="text-[#66736a]">{supplierTotalPages ? `Trang ${supplierPage}/${supplierTotalPages}` : "Không có trang dữ liệu"}</span>
            <button
              aria-label="Trang nhà cung cấp trước"
              className="rounded border border-[#dfe8dd] p-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={supplierLoading || supplierPage <= 1}
              onClick={() => setSupplierPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Trang nhà cung cấp sau"
              className="rounded border border-[#dfe8dd] p-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={supplierLoading || supplierPage >= supplierTotalPages}
              onClick={() => setSupplierPage((current) => current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {modalOpen && <AdminModal title={editingSupplier ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp"} description="Thông tin nhà vườn/hợp tác xã dùng cho đơn nhập hàng." onClose={() => setModalOpen(false)} footer={<><button className="rounded-lg border px-4 py-2 text-xs" onClick={() => setModalOpen(false)}>Hủy</button><button form="supplier-form" disabled={savingSupplier} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{savingSupplier ? "Đang lưu..." : "Lưu nhà cung cấp"}</button></>}>
        {supplierError && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{supplierError}</div>}
        <form id="supplier-form" onSubmit={(event) => void saveSupplier(event)} className="grid gap-4 sm:grid-cols-2 text-xs">
          <label>Mã NCC<input required maxLength={50} className="mt-1 w-full rounded-lg border p-3" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
          <label>Tên nhà cung cấp<input required maxLength={200} className="mt-1 w-full rounded-lg border p-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Người liên hệ<input maxLength={200} className="mt-1 w-full rounded-lg border p-3" value={form.contactPerson ?? ""} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></label>
          <label>Số điện thoại<input maxLength={50} className="mt-1 w-full rounded-lg border p-3" value={form.phone ?? ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Email<input type="email" maxLength={256} className="mt-1 w-full rounded-lg border p-3" value={form.email ?? ""} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Mã số thuế<input maxLength={50} className="mt-1 w-full rounded-lg border p-3" value={form.taxCode ?? ""} onChange={(event) => setForm({ ...form, taxCode: event.target.value })} /></label>
          <label className="sm:col-span-2">Địa chỉ<input maxLength={1000} className="mt-1 w-full rounded-lg border p-3" value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <label className="sm:col-span-2">Ghi chú<textarea maxLength={2000} className="mt-1 w-full rounded-lg border p-3" rows={3} value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        </form>
      </AdminModal>}
    </>
  );
}
