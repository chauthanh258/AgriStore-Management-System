"use client";

import { useState } from "react";
import { products } from "../../../data/mock";
import { customers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import { PageHeader, StatusBadge } from "../../../components/admin/admin-ui";

export default function PosPage() {
  const [cart, setCart] = useState<Record<string, number>>({
    [products[0].id]: 2,
    [products[1].id]: 1
  });
  const [customerId, setCustomerId] = useState(customers[0].id);
  const total = Object.entries(cart).reduce(
    (sum, [id, quantity]) =>
      sum +
      (products.find((item) => item.id === id)?.sellingPrice ?? 0) * quantity,
    0
  );
  const add = (id: string) => setCart({ ...cart, [id]: (cart[id] ?? 0) + 1 });
  return (
    <>
      <PageHeader
        eyebrow="BÁN HÀNG　›　POINT OF SALE"
        title="Bán hàng tại quầy (POS)"
        description="Tạo đơn nhanh, đọc cân điện tử và thanh toán tại cửa hàng."
        action={
          <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
            ⌘ F2 Tạo đơn mới
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-4 flex gap-2 rounded-xl border border-[#dfe8dd] bg-white p-3">
            <input
              className="flex-1 rounded-lg border p-3 text-xs"
              placeholder="⌕ Tìm sản phẩm, SKU hoặc quét mã vạch..."
            />
            <button className="rounded-lg bg-[#006948] px-4 text-xs text-white">
              ⌁ Quét mã F3
            </button>
            <button className="rounded-lg bg-[#f2f7ef] px-4 text-xs">
              ⚖ Cân điện tử 1.250 kg
            </button>
          </div>
          <div className="mb-4 flex gap-2 overflow-auto">
            {[
              "Tất cả (84)",
              "Rau ăn lá",
              "Củ quả Đà Lạt",
              "Trái cây VietGAP",
              "Gạo & Hạt"
            ].map((item, index) => (
              <button
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs ${index === 0 ? "bg-[#006948] text-white" : "bg-white"}`}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {products.map((product) => (
              <button
                onClick={() => add(product.id)}
                className="rounded-xl border border-[#dfe8dd] bg-white p-3 text-left hover:border-[#006948]"
                key={product.id}
              >
                <div
                  className="h-24 rounded bg-cover bg-center"
                  style={{ backgroundImage: `url(${product.mainImageUrl})` }}
                />
                <small className="mt-2 block text-[10px] text-[#66736a]">
                  Còn {product.minStockAlert + 12} · {product.code}
                </small>
                <b className="mt-1 block truncate text-xs">{product.name}</b>
                <span className="text-sm font-bold text-[#006948]">
                  {formatCurrency(product.sellingPrice)}
                </span>
              </button>
            ))}
          </div>
        </section>
        <aside className="h-fit rounded-xl border border-[#dfe8dd] bg-white p-4 xl:sticky xl:top-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Đơn 1 (Đang thu)</h2>
            <button className="text-xs">＋</button>
          </div>
          <select
            className="mb-4 w-full rounded-lg border p-3 text-xs"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>
                {customer.fullName} · {customer.memberTier}
              </option>
            ))}
          </select>
          <div className="space-y-2">
            {Object.entries(cart).map(([id, quantity]) => {
              const product = products.find((item) => item.id === id);
              return product ? (
                <div
                  className="flex items-center justify-between rounded-lg bg-[#f2f7ef] p-3 text-xs"
                  key={id}
                >
                  <span>
                    <b>{product.name}</b>
                    <small className="block text-[#66736a]">
                      x {quantity} · {product.unitName}
                    </small>
                  </span>
                  <b>{formatCurrency(product.sellingPrice * quantity)}</b>
                </div>
              ) : null;
            })}
          </div>
          <input
            className="my-4 w-full rounded-lg border p-3 text-xs"
            placeholder="Mã voucher..."
          />
          <div className="space-y-3 border-t pt-4 text-xs">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <b>{formatCurrency(total)}</b>
            </div>
            <div className="flex justify-between">
              <span>Ưu đãi VIP Gold</span>
              <b className="text-[#006948]">-30.000 đ</b>
            </div>
            <div className="flex justify-between text-lg">
              <b>Khách phải trả</b>
              <b className="text-[#006948]">
                {formatCurrency(Math.max(0, total - 30000))}
              </b>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button className="rounded bg-[#006948] p-2 text-[10px] text-white">
              F8 Tiền mặt
            </button>
            <button className="rounded bg-[#f2f7ef] p-2 text-[10px]">
              F9 VietQR
            </button>
            <button className="rounded bg-[#f2f7ef] p-2 text-[10px]">
              F10 Thẻ
            </button>
          </div>
          <button className="mt-3 w-full rounded-xl bg-[#006948] py-4 font-bold text-white">
            ▣ THANH TOÁN & IN (F12)
          </button>
          <p className="mt-3 text-center text-[10px] text-[#66736a]">
            <StatusBadge>Đã kết nối VietQR 24/7</StatusBadge>
          </p>
        </aside>
      </div>
    </>
  );
}
