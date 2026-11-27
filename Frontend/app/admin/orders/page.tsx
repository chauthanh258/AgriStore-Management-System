"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  AdminModal,
  DataTable,
  PageHeader,
  StatusBadge
} from "../../../components/admin/admin-ui";
import { statusTone } from "../../../components/admin/resource-page";
import { customers, orders } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import {
  createDelivery,
  getDelivery,
  updateDeliveryStatus,
  type Delivery
} from "../../../services/deliveries/delivery.service";
import {
  createPayment,
  getPayment,
  updatePaymentStatus,
  type Payment
} from "../../../services/payments/payment.service";
import { getAdminOrders } from "../../../services/orders/admin-order.service";
import type { Order } from "../../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
const orderStatuses = ["Pending", "Confirmed", "Processing", "Shipping", "Completed", "Cancelled"];

function isNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export default function OrdersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apiOrders, setApiOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(!useMock);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [trackingCode, setTrackingCode] = useState("");
  const [shipperName, setShipperName] = useState("");
  const [shipperPhone, setShipperPhone] = useState("");

  useEffect(() => {
    if (useMock) return;
    getAdminOrders({ page: 1, pageSize: 100 })
      .then((result) => setApiOrders(result.items))
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "Không thể tải đơn hàng.")
      )
      .finally(() => setLoading(false));
  }, []);

  const currentOrders = useMock ? orders : apiOrders;
  const selectedOrder = currentOrders.find((order) => order.id === selectedId);
  const filteredOrders = useMemo(
    () =>
      currentOrders.filter((order) => {
        const customerName = customers.find((customer) => customer.id === order.customerId)?.fullName ?? "";
        const searchText = `${order.code} ${order.status} ${customerName} ${order.details.map((item) => item.productName).join(" ")}`.toLowerCase();
        return (
          (statusFilter === "All" || order.status === statusFilter) &&
          searchText.includes(search.trim().toLowerCase())
        );
      }),
    [currentOrders, search, statusFilter]
  );

  useEffect(() => {
    if (!selectedOrder || useMock) return;

    let active = true;
    Promise.all([
      getPayment(selectedOrder.id).catch((loadError: unknown) => {
        if (isNotFound(loadError)) return null;
        throw loadError;
      }),
      getDelivery(selectedOrder.id).catch((loadError: unknown) => {
        if (isNotFound(loadError)) return null;
        throw loadError;
      })
    ])
      .then(([currentPayment, currentDelivery]) => {
        if (!active) return;
        setPayment(currentPayment);
        setDelivery(currentDelivery);
      })
      .catch((loadError: unknown) =>
        active && setDetailError(loadError instanceof Error ? loadError.message : "Không thể tải thanh toán và giao hàng.")
      );
    return () => {
      active = false;
    };
  }, [selectedOrder]);

  function openOrder(orderId: string) {
    setPayment(null);
    setDelivery(null);
    setDetailError("");
    setSelectedId(orderId);
  }

  async function savePayment() {
    if (!selectedOrder) return;
    setSaving(true);
    setDetailError("");
    try {
      const result = useMock
        ? {
            id: `payment-${Date.now()}`,
            orderId: selectedOrder.id,
            paymentMethod,
            amount: selectedOrder.totalAmount,
            status: paymentMethod === "Cash" ? "Paid" : "Pending",
            transactionCode: null,
            paidAt: paymentMethod === "Cash" ? new Date().toISOString() : null,
            notes: useMock ? "Giao dịch mô phỏng" : null
          }
        : await createPayment(selectedOrder.id, { paymentMethod });
      setPayment(result);
    } catch (saveError: unknown) {
      setDetailError(saveError instanceof Error ? saveError.message : "Không thể tạo thanh toán.");
    } finally {
      setSaving(false);
    }
  }

  async function changePaymentStatus(status: string) {
    if (!selectedOrder || !payment) return;
    setSaving(true);
    setDetailError("");
    try {
      const result = useMock
        ? { ...payment, status }
        : await updatePaymentStatus(selectedOrder.id, { status });
      setPayment(result);
    } catch (saveError: unknown) {
      setDetailError(saveError instanceof Error ? saveError.message : "Không thể cập nhật thanh toán.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDelivery() {
    if (!selectedOrder) return;
    setSaving(true);
    setDetailError("");
    try {
      const result = useMock
        ? {
            id: `delivery-${Date.now()}`,
            orderId: selectedOrder.id,
            trackingCode: trackingCode || null,
            driverName: shipperName || null,
            driverPhone: shipperPhone || null,
            status: "Preparing"
          }
        : await createDelivery(selectedOrder.id, {
            trackingCode,
            shipperName,
            shipperPhone
          });
      setDelivery(result);
    } catch (saveError: unknown) {
      setDetailError(saveError instanceof Error ? saveError.message : "Không thể tạo vận đơn.");
    } finally {
      setSaving(false);
    }
  }

  async function changeDeliveryStatus(status: string) {
    if (!selectedOrder || !delivery) return;
    setSaving(true);
    setDetailError("");
    try {
      const result = useMock
        ? { ...delivery, status }
        : await updateDeliveryStatus(selectedOrder.id, status);
      setDelivery(result);
    } catch (saveError: unknown) {
      setDetailError(saveError instanceof Error ? saveError.message : "Không thể cập nhật giao hàng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="BÁN HÀNG › OMNICHANNEL"
        title="Quản lý đơn hàng"
        description="Tra cứu đơn bán, lọc trạng thái và xử lý thanh toán, giao hàng."
      />
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      <section className="mb-4 flex flex-wrap gap-3 rounded-xl border border-[#dfe8dd] bg-white p-3">
        <input
          aria-label="Tìm đơn hàng"
          className="min-w-[220px] flex-1 rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs"
          placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Lọc trạng thái đơn hàng"
          className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="All">Tất cả trạng thái</option>
          {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </section>
      <section className="rounded-xl border border-[#dfe8dd] bg-white p-4">
        <div className="mb-3 flex justify-between text-xs text-[#66736a]">
          <span>Đơn hàng <b className="text-[#006948]">{filteredOrders.length}</b></span>
          <span>{useMock ? "Dữ liệu mô phỏng" : loading ? "Đang tải..." : "Dữ liệu hệ thống"}</span>
        </div>
        {loading ? (
          <p className="py-8 text-center text-xs text-[#66736a]">Đang tải danh sách đơn hàng...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#66736a]">Không tìm thấy đơn hàng phù hợp.</p>
        ) : (
          <DataTable headers={["Mã đơn / ngày", "Khách hàng", "Sản phẩm", "Tổng tiền", "Trạng thái"]}>
            {filteredOrders.map((order) => {
              const customer = customers.find((item) => item.id === order.customerId);
              return (
                <tr className="hover:bg-[#f8fbf7]" key={order.id}>
                  <td className="px-3 py-3">
                    <button className="font-bold text-[#006948] hover:underline" onClick={() => openOrder(order.id)}>{order.code}</button>
                    <small className="mt-1 block text-[10px] text-[#66736a]">{new Date(order.orderDate).toLocaleDateString("vi-VN")}</small>
                  </td>
                  <td className="px-3 py-3">{customer?.fullName ?? (order.customerId ? "Khách hàng" : "Khách vãng lai")}</td>
                  <td className="px-3 py-3">{order.details[0]?.productName ?? "—"}{order.details.length > 1 ? ` + ${order.details.length - 1} sản phẩm` : ""}</td>
                  <td className="px-3 py-3 font-semibold">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-3 py-3"><StatusBadge tone={statusTone(order.status)}>{order.status}</StatusBadge></td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </section>

      {selectedOrder && (
        <AdminModal
          title={`Đơn hàng ${selectedOrder.code}`}
          description="Chi tiết đơn, trạng thái thanh toán và thông tin vận đơn."
          onClose={() => setSelectedId(null)}
          footer={<button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white" onClick={() => setSelectedId(null)}>Đóng</button>}
        >
          <div className="space-y-3 text-xs">
            {detailError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{detailError}</div>}
            <div className="flex items-center justify-between"><span>Trạng thái đơn</span><StatusBadge tone={statusTone(selectedOrder.status)}>{selectedOrder.status}</StatusBadge></div>
            {selectedOrder.details.map((detail) => (
              <div className="flex justify-between rounded-lg bg-[#f2f7ef] p-3" key={detail.productId}>
                <span>{detail.productName}<small className="block text-[#66736a]">{detail.quantity} × {formatCurrency(detail.unitPrice)}</small></span>
                <b>{formatCurrency(detail.totalPrice)}</b>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3 text-base"><b>Tổng cộng</b><b className="text-[#006948]">{formatCurrency(selectedOrder.totalAmount)}</b></div>

            <div className="grid grid-cols-2 gap-2 border-b pt-2">
              <a href="#payment-panel" className="rounded-lg bg-[#eff7ed] px-3 py-2 text-center font-semibold text-[#006948]">Thanh toán</a>
              <a href="#delivery-panel" className="rounded-lg bg-[#eff7ed] px-3 py-2 text-center font-semibold text-[#006948]">Giao hàng</a>
            </div>

            <section id="payment-panel" className="space-y-3 rounded-lg border border-[#e7eee4] p-3">
              <div className="flex items-center justify-between"><h3 className="font-bold">Thanh toán</h3>{payment && <StatusBadge tone={statusTone(payment.status)}>{payment.status}</StatusBadge>}</div>
              {payment ? (
                <>
                  <p>{payment.paymentMethod} · {formatCurrency(payment.amount)}</p>
                  {payment.status === "Pending" && (
                    <button disabled={saving} onClick={() => changePaymentStatus("Paid")} className="rounded-lg bg-[#006948] px-3 py-2 font-semibold text-white disabled:opacity-50">Xác nhận đã thanh toán</button>
                  )}
                  {payment.status === "Failed" && (
                    <button disabled={saving} onClick={() => changePaymentStatus("Pending")} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">Thử thanh toán lại</button>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <select aria-label="Phương thức thanh toán" className="min-w-40 rounded-lg border p-2" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option value="Cash">Tiền mặt</option>
                    <option value="BankTransfer">Chuyển khoản</option>
                    {selectedOrder.shippingAddressId && <option value="CashOnDelivery">Thanh toán khi nhận hàng</option>}
                  </select>
                  <button disabled={saving} onClick={savePayment} className="rounded-lg bg-[#006948] px-3 py-2 font-semibold text-white disabled:opacity-50">Tạo thanh toán</button>
                </div>
              )}
            </section>

            <section id="delivery-panel" className="space-y-3 rounded-lg border border-[#e7eee4] p-3">
              <div className="flex items-center justify-between"><h3 className="font-bold">Giao hàng</h3>{delivery && <StatusBadge tone={statusTone(delivery.status)}>{delivery.status}</StatusBadge>}</div>
              {delivery ? (
                <>
                  <p>Mã vận đơn: {delivery.trackingCode || "Chưa có"} · Shipper: {delivery.driverName || "Chưa phân công"}</p>
                  {delivery.status === "Preparing" && <button disabled={saving} onClick={() => changeDeliveryStatus("Shipped")} className="rounded-lg bg-[#006948] px-3 py-2 font-semibold text-white disabled:opacity-50">Bắt đầu giao</button>}
                  {delivery.status === "Shipped" && (
                    <div className="flex gap-2">
                      <button disabled={saving} onClick={() => changeDeliveryStatus("Delivered")} className="rounded-lg bg-[#006948] px-3 py-2 font-semibold text-white disabled:opacity-50">Đã giao</button>
                      <button disabled={saving} onClick={() => changeDeliveryStatus("Failed")} className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 disabled:opacity-50">Giao thất bại</button>
                    </div>
                  )}
                  {delivery.status === "Failed" && <button disabled={saving} onClick={() => changeDeliveryStatus("Shipped")} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">Giao lại</button>}
                </>
              ) : (
                <>
                  {selectedOrder.status !== "Confirmed" && !useMock && <p className="text-amber-700">Chỉ tạo vận đơn khi đơn hàng đã được xác nhận.</p>}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input className="rounded-lg border p-2" placeholder="Mã vận đơn" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} />
                    <input className="rounded-lg border p-2" placeholder="Tên shipper" value={shipperName} onChange={(event) => setShipperName(event.target.value)} />
                    <input className="rounded-lg border p-2" placeholder="SĐT shipper" value={shipperPhone} onChange={(event) => setShipperPhone(event.target.value)} />
                  </div>
                  <button disabled={saving || (!useMock && selectedOrder.status !== "Confirmed")} onClick={saveDelivery} className="rounded-lg bg-[#006948] px-3 py-2 font-semibold text-white disabled:opacity-50">Tạo vận đơn</button>
                </>
              )}
            </section>
          </div>
        </AdminModal>
      )}
    </>
  );
}
