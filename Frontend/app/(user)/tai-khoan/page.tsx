"use client";

import { useState } from "react";
import { customer } from "../../../data/mock";

export default function AccountPage() {
  const [saved, setSaved] = useState(false);
  return (
    <main className="mx-auto w-7xl px-6 py-6">
      <p className="mb-5 text-[11px] text-[var(--muted)]">
        Trang chủ　›　<b>Tài khoản cá nhân</b>
      </p>
      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <aside className="h-fit rounded-xl border border-[var(--line)] bg-white p-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f8caa4] font-bold text-[#7b3d24]">
            MA
          </div>
          <h2 className="mt-3 font-bold">{customer.fullName}</h2>
          <span className="rounded-full bg-[#fff1c9] px-2 py-1 text-[10px] text-[#a65a00]">
            Hạng Vàng (Gold Member)
          </span>
          <div className="my-5 rounded-lg bg-[#eff7eb] p-3 text-left text-xs text-[var(--muted)]">
            Điểm tích lũy
            <b className="block text-2xl text-[var(--green)]">
              {customer.loyaltyPoints.toLocaleString("vi-VN")}
            </b>
            <small>AgriPoints</small>
          </div>
          <nav className="text-left text-xs">
            <a className="block rounded bg-[var(--mint)] p-3 text-[var(--deep)]">
              ♙ Thông tin tài khoản
            </a>
            <a className="block border-b border-[var(--line)] p-3">
              ▣ Quản lý đơn hàng
            </a>
            <a className="block border-b border-[var(--line)] p-3">
              ⌖ Sổ địa chỉ nhận hàng
            </a>
            <a className="block border-b border-[var(--line)] p-3">
              ♡ Sản phẩm yêu thích
            </a>
            <a className="block p-3 text-red-600">⇥ Đăng xuất tài khoản</a>
          </nav>
        </aside>
        <section>
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              "28|Tổng đơn đã mua",
              "1.250|Điểm hiện có",
              "GOLD|Hạng thành viên",
              "850.000 đ|Tiết kiệm tích lũy"
            ].map((stat) => {
              const [value, label] = stat.split("|");
              return (
                <b
                  key={label}
                  className="rounded-xl border border-[var(--line)] bg-white p-4 text-center text-xl text-[var(--green)]"
                >
                  {value}
                  <small className="mt-1 block text-[10px] font-normal text-[var(--muted)]">
                    {label}
                  </small>
                </b>
              );
            })}
          </div>
          <div className="mb-4 rounded-xl border border-[var(--line)] bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">Hồ sơ người dùng</h2>
                <p className="text-xs text-[var(--muted)]">
                  Cập nhật thông tin nhận diện để tối ưu quyền lợi.
                </p>
              </div>
              <small className="text-[var(--muted)]">
                Cập nhật lần cuối: 24/09/2026
              </small>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Họ và tên *", customer.fullName],
                ["Địa chỉ Email", customer.email],
                ["Số điện thoại liên lạc *", customer.phone],
                ["Ngày sinh", "15/08/1994"]
              ].map(([label, value]) => (
                <label className="text-xs font-bold" key={label}>
                  {label}
                  <input
                    className="mt-1 block w-full rounded-lg border border-[var(--line)] p-3 font-normal outline-[var(--green)]"
                    defaultValue={value}
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 block text-xs font-bold">
              Ghi chú khẩu vị, ăn chay hoặc dị ứng thực phẩm
              <textarea
                className="mt-1 block min-h-20 w-full rounded-lg border border-[var(--line)] p-3 font-normal"
                defaultValue={customer.notes ?? ""}
              />
            </label>
            <button
              onClick={() => setSaved(true)}
              className="mt-4 rounded-lg bg-[var(--green)] px-4 py-3 text-xs font-bold text-white"
            >
              {saved ? "✓ Đã lưu thay đổi" : "▣ Lưu thay đổi"}
            </button>
          </div>
          <div className="mb-4 rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">Sổ địa chỉ nhận hàng</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-[#f2f7ef] p-4 text-xs">
                <b>⌂ Nhà riêng (Căn hộ)</b>
                <p className="leading-6 text-[var(--muted)]">
                  {customer.addresses[0].receiverName}
                  <br />
                  {customer.addresses[0].detailAddress},{" "}
                  {customer.addresses[0].district},{" "}
                  {customer.addresses[0].province}
                </p>
                <a className="text-[var(--green)]">Chỉnh sửa　·　Xóa</a>
              </div>
              <div className="rounded-lg bg-[#f2f7ef] p-4 text-xs">
                <b>▣ Văn phòng làm việc</b>
                <p className="leading-6 text-[var(--muted)]">
                  {customer.addresses[0].receiverName}
                  <br />
                  Tầng 8, Tòa nhà Fico, Quận 1, TP. Hồ Chí Minh
                </p>
                <a className="text-[var(--green)]">Chỉnh sửa　·　Xóa</a>
              </div>
            </div>
          </div>
          <div id="don-hang" className="scroll-mt-24 rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-bold">Lịch sử đơn hàng gần đây</h2>
            <p className="mt-4 rounded-lg bg-[#f3f8f0] p-4 text-xs">
              <b>#AGR-2026-9882</b>　·　Đặt lúc: 08:30 - 24/09/2026{" "}
              <span className="float-right rounded bg-[#ffe1bd] px-2 py-1 text-[#a45100]">
                Đang vận chuyển
              </span>
            </p>
            <p className="mt-2 rounded-lg bg-[#f3f8f0] p-4 text-xs">
              <b>#AGR-2026-9104</b>　·　Hoàn thành: 14:15 - 18/09/2026{" "}
              <span className="float-right rounded bg-[var(--mint)] px-2 py-1 text-[var(--deep)]">
                Đã giao thành công
              </span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
