"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency } from "../../../lib/formatters";
import { useCart } from "../../../providers/cart-provider";
import type { Product } from "../../../types/api";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { add } = useCart();
  const router = useRouter();
  const addToCart = (goToCart = false) => {
    add(product, quantity);
    if (goToCart) router.push("/gio-hang");
  };
  return (
    <div>
      <small className="text-[var(--muted)]">SKU: {product.code}</small>
      <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
      <p className="text-xs text-[#bf6a26]">
        ★ 4.9 (128 đánh giá) · 480 đã bán tuần này
      </p>
      <div className="my-5 rounded-xl bg-[#eef6ea] p-4">
        <b className="text-2xl text-[var(--green)]">
          {formatCurrency(product.sellingPrice)}
        </b>
        <del className="ml-3 text-xs text-[var(--muted)]">
          {formatCurrency(product.sellingPrice * 1.3)}
        </del>
        <small className="mt-2 block text-[var(--muted)]">
          Đã bao gồm thuế GTGT & thông báo giá lạnh tiêu chuẩn
        </small>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <span className="rounded bg-[#f7faf5] p-3 text-[var(--muted)]">
          Xuất xứ
          <b className="mt-1 block text-[var(--ink)]">Mộc Châu, Sơn La</b>
        </span>
        <span className="rounded bg-[#f7faf5] p-3 text-[var(--muted)]">
          Hạn sử dụng
          <b className="mt-1 block text-[var(--ink)]">
            {product.expiryDays} ngày
          </b>
        </span>
        <span className="rounded bg-[#f7faf5] p-3 text-[var(--muted)]">
          Quy cách
          <b className="mt-1 block text-[var(--ink)]">{product.unitName}</b>
        </span>
        <span className="rounded bg-[#f7faf5] p-3 text-[var(--muted)]">
          Tình trạng kho
          <b className="mt-1 block text-[var(--green)]">Còn hàng</b>
        </span>
      </div>
      <h4 className="mt-5 font-semibold">Chọn số lượng:</h4>
      <div className="mt-3 flex gap-2">
        <div className="flex items-center rounded-lg border border-[var(--line)]">
          <button
            className="px-3 py-2"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >
            −
          </button>
          <b className="px-2">{quantity}</b>
          <button
            className="px-3 py-2"
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </button>
        </div>
        <button
          className="rounded-lg border border-[#bfd2be] px-4 py-2 text-xs text-[var(--deep)]"
          onClick={() => addToCart()}
        >
          Thêm vào giỏ hàng
        </button>
        <button
          className="rounded-lg bg-[var(--green)] px-4 py-2 text-xs font-bold text-white"
          onClick={() => addToCart(true)}
        >
          Mua ngay
        </button>
      </div>
      <ul className="mt-5 space-y-2 rounded-lg bg-[#f2f8ef] p-4 text-[11px] leading-5 text-[#53705d]">
        <li>✓ Cam kết ngon sạch: Đổi trả nếu cây bị hư, mọng nước</li>
        <li>♧ Đổi trả trong 24 giờ: Nhận phản hồi 24/7</li>
        <li>ϟ Giao siêu tốc 2 giờ: Đóng thùng xốp cách nhiệt</li>
      </ul>
    </div>
  );
}
