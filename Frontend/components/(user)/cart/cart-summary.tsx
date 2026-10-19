import { formatCurrency } from "../../../lib/formatters";

export function CartSummary({
  subtotal,
  disabled,
  onCheckout
}: {
  subtotal: number;
  disabled: boolean;
  onCheckout: () => void;
}) {
  return (
    <aside className="h-fit rounded-xl border border-[var(--line)] bg-white p-5 lg:sticky lg:top-4">
      <h2 className="mb-5 text-lg font-bold">Tóm tắt đơn hàng</h2>
      <input
        className="mb-2 w-full rounded-lg border border-[var(--line)] p-3"
        placeholder="Nhập mã giảm giá..."
      />
      <button className="w-full rounded-lg border border-[#bfd2be] px-3 py-2 text-xs text-[var(--deep)]">
        Áp dụng
      </button>
      <div className="my-5 flex justify-between text-xs">
        <span>Tạm tính</span>
        <b>{formatCurrency(subtotal)}</b>
      </div>
      <div className="my-5 flex justify-between text-xs">
        <span>Phí giao hàng</span>
        <b className="text-[var(--green)]">Miễn phí</b>
      </div>
      <hr />
      <div className="my-5 flex items-center justify-between">
        <span className="font-bold">Tổng thanh toán</span>
        <b className="text-2xl text-[var(--green)]">
          {formatCurrency(subtotal)}
        </b>
      </div>
      <button
        disabled={disabled}
        onClick={onCheckout}
        className="w-full rounded-lg bg-[var(--green)] px-4 py-3 font-bold text-white disabled:opacity-50"
      >
        Tiến hành đặt hàng & Thanh toán →
      </button>
    </aside>
  );
}
