"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { products } from "../../../data/mock";
import { formatCurrency } from "../../../lib/formatters";
import { useCart } from "../../../providers/cart-provider";
import { CartItem } from "../../../components/(user)/cart/cart-item";
import { CartSummary } from "../../../components/(user)/cart/cart-summary";

export default function CartPage() {
  const { cart, update, remove } = useCart();
  const router = useRouter();
  const entries = Object.entries(cart)
    .map(([id, quantity]) => ({
      product: products.find((item) => item.id === id),
      quantity
    }))
    .filter(
      (
        entry
      ): entry is { product: (typeof products)[number]; quantity: number } =>
        Boolean(entry.product)
    );
  const subtotal = entries.reduce(
    (total, entry) => total + entry.product.sellingPrice * entry.quantity,
    0
  );
  return (
    <main className="mx-auto w-7xl px-6 py-6">
      <p className="mb-5 text-[11px] text-[var(--muted)]">
        Trang chủ　›　<b>Giỏ hàng & Thanh toán</b>
      </p>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_.8fr]">
        <section>
          <div className="mb-4 rounded-lg bg-[#e5f7e9] p-4 text-[var(--green)]">
            🚚 Bạn chỉ cần mua thêm{" "}
            <b>{formatCurrency(Math.max(0, 300000 - subtotal))}</b> để được{" "}
            <strong>MIỄN PHÍ VẬN CHUYỂN</strong>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">
              ☑ Chọn tất cả ({entries.length} sản phẩm)
            </h2>
            {entries.length ? (
              entries.map(({ product, quantity }) => (
                <CartItem
                  key={product.id}
                  product={product}
                  quantity={quantity}
                  onUpdate={(next) => update(product.id, next)}
                  onRemove={() => remove(product.id)}
                />
              ))
            ) : (
              <div className="p-16 text-center text-[var(--muted)]">
                Giỏ hàng đang trống.{" "}
                <Link className="text-[var(--green)]" href="/san-pham">
                  Khám phá sản phẩm →
                </Link>
              </div>
            )}
          </div>
          <Link
            href="/san-pham"
            className="my-5 inline-block text-xs text-[var(--green)]"
          >
            ← Tiếp tục mua thêm nông sản khác
          </Link>
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">
              ◷ Hẹn giờ giao nông sản tươi
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <button className="rounded-lg border border-[var(--green)] bg-[#effaf2] p-4 text-left">
                ◉ Giao ngay siêu tốc 2H
                <small className="mt-2 block text-[var(--muted)]">
                  Đóng thùng cách nhiệt lạnh
                </small>
              </button>
              <button className="rounded-lg border border-[var(--line)] bg-[#f7faf5] p-4 text-left">
                ○ Chọn khung giờ hôm nay / ngày mai
                <small className="mt-2 block text-[var(--muted)]">
                  Khung 16h - 18h chiều nay
                </small>
              </button>
            </div>
            <textarea
              className="mt-4 w-full rounded-lg border border-[var(--line)] p-3"
              placeholder="Ghi chú cho nhân viên chọn nông sản"
            />
          </div>
        </section>
        <CartSummary
          subtotal={subtotal}
          disabled={!entries.length}
          onCheckout={() => router.push("/dat-hang")}
        />
      </div>
    </main>
  );
}
