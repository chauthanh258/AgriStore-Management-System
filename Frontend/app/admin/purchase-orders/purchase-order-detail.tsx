"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isAxiosError } from "axios";
import { AdminModal } from "../../../components/admin/admin-ui";
import { formatCurrency } from "../../../lib/formatters";
import type { PurchaseOrder, ReceivePurchaseOrderRequest } from "../../../types/purchase-orders";
import type { StockTransaction } from "../../../types/api";
import { getStockTransactions } from "../../../services/inventory/inventory.service";
import "./purchase-order-receipt.css";

export type UncertainAction = {
  action: "order" | "receive";
  lines: Array<{ name: string; before: number; quantity: number }>;
};

type Props = {
  orderId: string;
  mock: boolean;
  loadOrder: (id: string) => Promise<PurchaseOrder>;
  markOrdered: (id: string) => Promise<PurchaseOrder>;
  receiveOrder: (id: string, request: ReceivePurchaseOrderRequest) => Promise<PurchaseOrder>;
  onChanged: () => void;
  unresolved?: UncertainAction;
  onUncertain: (action: UncertainAction) => void;
  onReconciled: () => void;
  onClose: () => void;
};

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (typeof data === "object" && data !== null) {
      if ("detail" in data && typeof data.detail === "string") return data.detail;
      if ("title" in data && typeof data.title === "string") return data.title;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

function dateLabel(date: string) {
  return new Date(date).toLocaleDateString("vi-VN", { timeZone: "UTC" });
}

function statusLabel(status: string) {
  return ({ Draft: "Nháp", Ordered: "Đã đặt", Received: "Đã nhận", Cancelled: "Đã hủy" } as Record<string, string>)[status] ?? status;
}

export default function PurchaseOrderDetailModal({
  orderId, mock, loadOrder, markOrdered, receiveOrder, onChanged, unresolved, onUncertain, onReconciled, onClose
}: Props) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(unresolved
    ? "Kết quả thao tác trước chưa rõ. Hãy đối soát đơn và giao dịch kho trước khi thao tác tiếp để tránh nhận trùng."
    : "");
  const [notice, setNotice] = useState("");
  const [reloadRequired, setReloadRequired] = useState(Boolean(unresolved));
  const [outcomeUncertain, setOutcomeUncertain] = useState(Boolean(unresolved));
  const [reloadKey, setReloadKey] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<"order" | "receive" | null>(null);
  const busyRef = useRef(false);
  const reconciliationRequested = useRef(false);
  const [reconciliationLoaded, setReconciliationLoaded] = useState(false);
  const [history, setHistory] = useState<StockTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;
    loadOrder(orderId).then((result) => {
      if (!active) return;
      setOrder(result);
      setQuantities({});
      setLoading(false);
      if (reconciliationRequested.current) {
        setReconciliationLoaded(true);
        reconciliationRequested.current = false;
      }
    }).catch((loadError: unknown) => {
      if (!active) return;
      setError(errorMessage(loadError, "Không thể tải chi tiết đơn nhập."));
      setLoading(false);
      reconciliationRequested.current = false;
    });
    return () => { active = false; };
  }, [orderId, reloadKey, loadOrder]);

  // Tải lịch sử nhận hàng (StockTransaction) từ API mỗi khi order reload (chỉ khi không dùng mock)
  useEffect(() => {
    if (!orderId || mock) return;
    let active = true;
    setHistoryLoading(true);
    setHistoryError("");
    getStockTransactions({ referenceType: "PurchaseOrder", referenceId: orderId, pageSize: 50 })
      .then((result) => {
        if (!active) return;
        setHistory(result.items as StockTransaction[]);
        setHistoryLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setHistoryError(errorMessage(err, "Không thể tải lịch sử nhận hàng."));
        setHistoryLoading(false);
      });
    return () => { active = false; };
  }, [orderId, reloadKey, mock]);

  function reload() {
    reconciliationRequested.current = Boolean(unresolved);
    setReconciliationLoaded(false);
    setOrder(null);
    setError(unresolved ? "Kết quả thao tác trước chưa rõ. Hãy đối soát đơn và giao dịch kho trước khi thao tác tiếp để tránh nhận trùng." : "");
    setNotice("");
    setConfirmation(null);
    setReloadRequired(Boolean(unresolved));
    setOutcomeUncertain(Boolean(unresolved));
    setLoading(true);
    setReloadKey((current) => current + 1);
    onChanged();
  }

  function close() {
    if (!busyRef.current) onClose();
  }

  function prepareReceive(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || order.status !== "Ordered" || busyRef.current || reloadRequired) return;
    setError("");
    setNotice("");

    let hasQuantity = false;
    for (const detail of order.details) {
      const raw = quantities[detail.productId] ?? "";
      if (!raw.trim()) continue;
      const value = Number(raw);
      const remaining = Math.round((detail.quantity - detail.receivedQuantity) * 1000);
      if (!Number.isFinite(value) || value < 0 || !/^\d+(?:\.\d{1,3})?$/.test(raw) || Math.round(value * 1000) > remaining) {
        setError(`Số lượng nhận của ${detail.productName} phải từ 0 đến số lượng còn lại và có tối đa 3 chữ số thập phân.`);
        return;
      }
      if (value > 0) hasQuantity = true;
    }
    if (!hasQuantity) {
      setError("Vui lòng nhập số lượng lớn hơn 0 cho ít nhất một sản phẩm.");
      return;
    }
    setConfirmation("receive");
  }

  async function confirmAction() {
    if (!order || !confirmation || busyRef.current || reloadRequired) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const updated = confirmation === "order"
        ? await markOrdered(order.id)
        : await receiveOrder(order.id, {
            details: order.details.flatMap((detail) => {
              const quantity = Number(quantities[detail.productId] || 0);
              return quantity > 0 ? [{ productId: detail.productId, receivedQuantity: quantity }] : [];
            })
          });
      setOrder(updated);
      setQuantities({});
      setNotice(confirmation === "order" ? "Đã xác nhận đặt hàng." : "Đã xác nhận số lượng nhận.");
      setConfirmation(null);
      onChanged();
    } catch (actionError: unknown) {
      const status = isAxiosError(actionError) ? actionError.response?.status : undefined;
      const uncertain = !mock && (status === undefined || status === 408 || status >= 500);
      if (uncertain) onUncertain({
        action: confirmation,
        lines: confirmation === "receive"
          ? order.details.flatMap((detail) => {
              const quantity = Number(quantities[detail.productId] || 0);
              return quantity > 0 ? [{ name: detail.productName, before: detail.receivedQuantity, quantity }] : [];
            })
          : []
      });
      if (uncertain) setReconciliationLoaded(false);
      setError(uncertain
        ? `${errorMessage(actionError, "Không thể xác nhận kết quả thao tác.")} Kết quả chưa rõ; không gửi lại ngay. Hãy kiểm tra đơn và giao dịch kho trước khi thao tác tiếp để tránh nhận trùng.`
        : `${errorMessage(actionError, "Không thể thực hiện thao tác.")} Vui lòng tải lại đơn để kiểm tra trạng thái trước khi thử lại.`);
      setOutcomeUncertain(uncertain);
      setReloadRequired(true);
      setConfirmation(null);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const hasReceived = order?.details.some((detail) => detail.receivedQuantity > 0) ?? false;
  const receivedTotal = order?.details.reduce((total, detail) => total + detail.receivedQuantity * detail.unitPrice, 0) ?? 0;

  return <>
    <AdminModal
      title={order ? `Đơn nhập ${order.code}` : "Chi tiết đơn nhập"}
      description="Xem chi tiết, xác nhận đặt hàng và số lượng thực nhận."
      onClose={close}
      footer={<>
        <button type="button" disabled={busy} onClick={close} className="rounded-lg border px-4 py-2 text-xs disabled:opacity-50">Đóng</button>
        {order && hasReceived && !reloadRequired && <button type="button" disabled={busy} onClick={() => window.print()} className="rounded-lg border border-[#006948] px-4 py-2 text-xs font-bold text-[#006948] disabled:opacity-50">In / Lưu PDF</button>}
        {order?.status === "Draft" && !confirmation && !reloadRequired && <button type="button" disabled={busy} onClick={() => { setError(""); setNotice(""); setConfirmation("order"); }} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Xác nhận đặt hàng</button>}
        {order?.status === "Ordered" && !confirmation && !reloadRequired && <button type="submit" form="receive-order-form" disabled={busy} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Kiểm tra nhận hàng</button>}
        {confirmation && <button type="button" disabled={busy} onClick={() => void confirmAction()} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Đang xử lý..." : "Xác nhận"}</button>}
      </>}
    >
      {mock && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Dữ liệu thử: thao tác chỉ lưu tạm trên trang, không cập nhật tồn kho hoặc giao dịch thật.</p>}
      {error && <div role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error} {(!order || reloadRequired) && !outcomeUncertain && <button type="button" onClick={reload} className="font-bold underline">Tải lại đơn</button>}</div>}
      {outcomeUncertain && <div className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        <p>Thao tác chưa rõ kết quả: {unresolved?.action === "receive" ? "nhận hàng" : "xác nhận đặt hàng"}.</p>
        {unresolved?.lines.map((line, index) => <p key={index}>{line.name}: đã nhận trước đó {line.before}, yêu cầu nhận thêm {line.quantity}.</p>)}
        <button type="button" onClick={reload} className="mt-2 font-bold underline">Tải lại đơn (vẫn giữ cảnh báo)</button>
        {order && reconciliationLoaded && !loading && <button type="button" onClick={() => { onReconciled(); setReloadRequired(false); setOutcomeUncertain(false); setError(""); }} className="ml-3 font-bold underline">Tôi đã đối soát đơn và giao dịch kho</button>}
      </div>}
      {notice && <p role="status" className="mb-3 rounded-lg bg-green-50 p-3 text-xs text-green-700">{notice}</p>}
      {loading ? <p className="py-8 text-center text-sm">Đang tải chi tiết đơn nhập...</p> : order && <>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <p><b>Nhà cung cấp:</b> {order.supplierName}</p>
          <p><b>Kho nhận:</b> {order.warehouseName}</p>
          <p><b>Ngày đặt:</b> {dateLabel(order.orderDate)}</p>
          <p><b>Trạng thái:</b> {statusLabel(order.status)}</p>
        </div>
        <form id="receive-order-form" onSubmit={prepareReceive} className="mt-4">
          <fieldset disabled={busy || Boolean(confirmation) || reloadRequired} className="space-y-3">
            {order.details.map((detail) => {
              const remaining = Math.max(0, Math.round((detail.quantity - detail.receivedQuantity) * 1000) / 1000);
              return <div key={detail.productId} className="rounded-lg border border-[#e1e9df] p-3 text-xs">
                <p className="font-bold">{detail.productCode} — {detail.productName}</p>
                <p className="mt-1 text-[#536156]">Đặt: {detail.quantity} · Đã nhận: {detail.receivedQuantity} · Còn lại: {remaining} · Đơn giá: {formatCurrency(detail.unitPrice)}</p>
                {order.status === "Ordered" && <label className="mt-2 block font-semibold">Số lượng nhận lần này
                  <input aria-label={`Số lượng nhận lần này: ${detail.productName}`} type="number" min="0" max={remaining} step="0.001" disabled={remaining === 0} value={quantities[detail.productId] ?? ""} onChange={(event) => setQuantities((current) => ({ ...current, [detail.productId]: event.target.value }))} className="mt-1 block w-full rounded-lg border p-2 font-normal sm:w-40" />
                </label>}
              </div>;
            })}
          </fieldset>
        </form>
        {/* Lịch sử nhận hàng per-batch */}
        {!mock && (
          <section className="mt-5">
            <h3 className="mb-2 text-xs font-bold text-[#1c2a20]">Lịch sử nhận hàng</h3>
            {historyLoading ? (
              <p className="text-xs text-[#66736a]">Đang tải lịch sử...</p>
            ) : historyError ? (
              <p className="text-xs text-red-600">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-[#66736a]">Chưa có lần nhận hàng nào.</p>
            ) : (
              <div className="space-y-2">
                {history.map((batch) => (
                  <div key={batch.batchId} className="rounded-lg border border-[#e1e9df] bg-[#f8fbf7] p-3 text-xs">
                    <p className="font-semibold text-[#536156]">
                      {new Date(batch.createdAt).toLocaleString("vi-VN")}
                      {batch.notes && <span className="ml-2 font-normal text-[#66736a]">— {batch.notes}</span>}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {batch.lines.map((line) => (
                        <li key={line.id} className="flex gap-2 text-[#1c2a20]">
                          <span className="font-medium">{line.productCode} — {line.productName}</span>
                          <span className="text-[#006948]">+{line.quantity}</span>
                          {line.quantityBefore != null && line.quantityAfter != null && (
                            <span className="text-[#66736a]">({line.quantityBefore} → {line.quantityAfter})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {confirmation && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <p>{confirmation === "order" ? "Xác nhận đặt đơn này? Sau khi đặt sẽ không thể sửa đơn nháp." : "Xác nhận nhận các số lượng dưới đây? Thao tác sẽ cộng tồn kho khi dùng API thật."}</p>
          {confirmation === "receive" && <ul className="mt-2 list-inside list-disc">{order.details.filter((detail) => Number(quantities[detail.productId] || 0) > 0).map((detail) => <li key={detail.productId}>{detail.productName}: {quantities[detail.productId]}</li>)}</ul>}
          <button type="button" disabled={busy} onClick={() => setConfirmation(null)} className="mt-2 font-bold underline disabled:opacity-50">Quay lại chỉnh sửa</button>
        </div>}
      </>}
    </AdminModal>
    {order && hasReceived && !busy && !reloadRequired && createPortal(
      <div id="purchase-order-print-root">
        <h1>PHIẾU NHẬP HÀNG — TỔNG HỢP LŨY KẾ</h1>
        {mock && <p>DỮ LIỆU THỬ — KHÔNG PHẢI CHỨNG TỪ THỰC TẾ</p>}
        <p>Đây là số lượng đã nhận lũy kế theo đơn, không phải phiếu của một lần nhận riêng.</p>
        <p><b>Mã đơn:</b> {order.code} &nbsp; <b>Trạng thái:</b> {statusLabel(order.status)}</p>
        <p><b>Nhà cung cấp:</b> {order.supplierName}</p>
        <p><b>Kho nhận:</b> {order.warehouseName}</p>
        <p><b>Ngày đặt:</b> {dateLabel(order.orderDate)}</p>
        <table>
          <thead><tr><th>Sản phẩm</th><th>Số lượng đặt</th><th>Đã nhận lũy kế</th><th>Đơn giá</th><th>Giá trị đã nhận</th></tr></thead>
          <tbody>{order.details.map((detail) => <tr key={detail.productId}><td>{detail.productCode} — {detail.productName}</td><td>{detail.quantity}</td><td>{detail.receivedQuantity}</td><td>{formatCurrency(detail.unitPrice)}</td><td>{formatCurrency(detail.receivedQuantity * detail.unitPrice)}</td></tr>)}</tbody>
        </table>
        <p><b>Tổng giá trị đã nhận lũy kế:</b> {formatCurrency(receivedTotal)}</p>
        <p><b>Tổng giá trị đặt hàng:</b> {formatCurrency(order.totalAmount)}</p>
        {order.notes && <p><b>Ghi chú:</b> {order.notes}</p>}
      </div>, document.body
    )}
  </>;
}
