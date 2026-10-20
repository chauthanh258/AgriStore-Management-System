"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { customer, products } from "../../../data/mock";
import { getApiErrorMessage } from "../../../lib/axios/errors";
import { formatCurrency } from "../../../lib/formatters";
import { useCart } from "../../../providers/cart-provider";
import { orderRepository } from "../../../services/orders/order.repository";

export function CheckoutSections() {
  const { cart, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const entries = Object.entries(cart);
  const subtotal = entries.reduce(
    (total, [id, quantity]) =>
      total +
      (products.find((item) => item.id === id)?.sellingPrice ?? 0) * quantity,
    0
  );
  async function submit() {
    setLoading(true);
    setError("");
    try {
      await orderRepository.createOnlineOrder({
        customerId: customer.id,
        shippingAddressId: customer.addresses[0].id,
        shippingMethodId: "delivery-2h",
        warehouseId: "warehouse-central",
        note: "Giao trong giờ hành chính",
        items: entries.map(([productId, quantity]) => ({ productId, quantity }))
      });
      clear();
      router.push("/dat-hang/thanh-cong");
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="mx-auto min-h-[600px] max-w-7xl px-6 py-6">
      <div className="mb-6 flex justify-center gap-12 rounded-lg bg-[#eaf4e7] p-4 text-xs">
        <b className="text-[var(--green)]">✓ 1. Giỏ hàng</b>
        <b className="text-[var(--green)]">● 2. Giao hàng & Thanh toán</b>
        <span className="text-[var(--muted)]">3. Đặt hàng thành công</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_.8fr]">
        <section className="space-y-4">
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">
              1. Địa chỉ nhận hàng tươi
            </h2>
            <div className="flex gap-3 rounded-lg bg-[#f1f8ee] p-4">
              ◉{" "}
              <span>
                <b>
                  {customer.addresses[0].receiverName} ·{" "}
                  {customer.addresses[0].phone}
                </b>
                <small className="mt-1 block text-[var(--muted)]">
                  {customer.addresses[0].detailAddress},{" "}
                  {customer.addresses[0].ward}, {customer.addresses[0].district}
                  , {customer.addresses[0].province}
                </small>
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">
              2. Phương thức vận chuyển
            </h2>
            <div className="rounded-lg border border-[var(--green)] bg-[#effaf2] p-4">
              ◉ Giao Siêu Tốc 2 Giờ ⚡
              <small className="mt-2 block text-[var(--muted)]">
                Dành cho rau lá, giao trong thùng cách nhiệt lạnh
              </small>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">
              3. Phương thức thanh toán an toàn
            </h2>
            {[
              "Chuyển khoản VietQR Siêu Tốc 24/7",
              "Thanh toán khi nhận hàng (COD)",
              "Ví điện tử VNPay / MoMo",
              "Thẻ tín dụng / Ghi nợ"
            ].map((method, index) => (
              <label
                className="block border-b border-[var(--line)] p-3"
                key={method}
              >
                <input
                  type="radio"
                  name="payment"
                  defaultChecked={index === 0}
                />{" "}
                <b className="ml-2">{method}</b>
                <small className="mt-1 block pl-6 text-[var(--muted)]">
                  {index === 0
                    ? "Khuyến nghị · Tự động xác nhận đơn hàng"
                    : "Thanh toán an toàn, tiện lợi"}
                </small>
              </label>
            ))}
            <p className="mt-4 rounded-lg bg-[#e9faf1] p-3 text-xs text-[var(--deep)]">
              ✓ Cam kết hoàn tiền 100% trong 24 giờ nếu nông sản không đạt yêu
              cầu.
            </p>
          </div>
        </section>
        <aside className="h-fit rounded-xl border border-[var(--line)] bg-white p-5 lg:sticky lg:top-4">
          <h2 className="mb-4 text-lg font-bold">Đơn Hàng Của Bạn</h2>
          {entries.map(([id, quantity]) => {
            const product = products.find((item) => item.id === id);
            return product ? (
              <div className="my-3 flex justify-between text-xs" key={id}>
                <span>
                  {product.name}
                  <small className="block text-[var(--muted)]">
                    x{quantity}
                  </small>
                </span>
                <b>{formatCurrency(product.sellingPrice * quantity)}</b>
              </div>
            ) : null;
          })}
          <hr />
          <div className="my-4 flex justify-between text-xs">
            <span>Tạm tính</span>
            <b>{formatCurrency(subtotal)}</b>
          </div>
          <div className="my-4 flex justify-between">
            <b>Tổng cộng</b>
            <b className="text-2xl text-[var(--green)]">
              {formatCurrency(subtotal)}
            </b>
          </div>
          {error && (
            <p className="mb-3 rounded bg-red-100 p-3 text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={loading || !entries.length}
            onClick={submit}
            className="w-full rounded-lg bg-[var(--green)] px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "🔒 Xác nhận đặt hàng"}
          </button>
        </aside>
      </div>
    </main>
  );
}
