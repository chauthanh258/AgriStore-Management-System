import Link from "next/link";
export default function SuccessPage() {
  return (
    <main className="mx-auto min-h-[600px] max-w-2xl px-6 py-24 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--mint)] text-3xl text-[var(--green)]">
        ✓
      </div>
      <span className="mt-5 block text-[10px] font-bold tracking-widest text-[var(--green)]">
        ĐẶT HÀNG THÀNH CÔNG
      </span>
      <h1 className="my-3 text-4xl font-bold">Cảm ơn bạn đã đặt hàng!</h1>
      <p className="text-[var(--muted)]">
        Đơn hàng của bạn đã được tiếp nhận và đang được chuẩn bị tươi ngon từ
        nông trại.
      </p>
      <div className="my-6 rounded-xl border border-[var(--line)] bg-white p-5">
        <b>Mã đơn hàng: #AGR-2026-9882</b>
        <small className="mt-2 block text-[var(--muted)]">
          Dự kiến giao trong 2 giờ · Thanh toán khi nhận hàng
        </small>
      </div>
      <Link
        className="inline-block rounded-lg bg-[var(--green)] px-5 py-3 font-bold text-white"
        href="/tai-khoan"
      >
        Xem đơn hàng của tôi
      </Link>
      <Link className="mt-5 block text-sm text-[var(--green)]" href="/san-pham">
        Tiếp tục mua sắm →
      </Link>
    </main>
  );
}
