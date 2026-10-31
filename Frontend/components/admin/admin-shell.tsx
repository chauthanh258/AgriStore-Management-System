"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminAccountMenu } from "./admin-account-menu";

const groups = [
  { title: "TỔNG QUAN", links: [["dashboard", "⌂", "Tổng quan"]] },
  {
    title: "BÁN HÀNG",
    links: [
      ["pos", "▣", "Bán hàng tại quầy (POS)"],
      ["orders", "▤", "Quản lý đơn hàng"]
    ]
  },
  {
    title: "NÔNG SẢN & KHO",
    links: [
      ["products", "♧", "Danh mục & Sản phẩm"],
      ["inventory", "⌂", "Kho & Tồn kho"],
      ["purchase-orders", "▱", "Nhà cung cấp & Nhập hàng"]
    ]
  },
  {
    title: "KHÁCH HÀNG & MARKETING",
    links: [
      ["customers", "♙", "Khách hàng & Điểm"],
      ["reviews", "▤", "Quản lý đánh giá"],
      ["vouchers", "◇", "Khuyến mãi & Voucher"]
    ]
  },
  {
    title: "HỆ THỐNG",
    links: [
      ["reports", "▥", "Báo cáo & Thống kê"],
      ["staff", "♙", "Nhân viên & Phân quyền"],
      ["settings", "⚙", "Cài đặt cửa hàng"]
    ]
  }
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#f5f8f3] text-[#182018]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-1/7 border-r border-[#dfe8dd] bg-white lg:block">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 px-5 py-5 text-[#006948] h-1/12"
        >
          <span className="text-xl">✦</span>
          <span>
            <b className="block text-lg">AgriStore</b>
            <small className="block text-[9px] text-[#66736a]">
              QUẢN TRỊ NÔNG SẢN
            </small>
          </span>
        </Link>
        <nav className="px-3 overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-[#dfe8dd] scrollbar-track-[#f5f8f3] h-9/12">
          {groups.map((group) => (
            <div className="mb-5" key={group.title}>
              <small className="mb-2 block px-3 tracking-wide text-[#6e7c72] text-xs">
                {group.title}
              </small>
              {group.links.map(([slug, icon, label]) => (
                <Link
                  key={slug}
                  href={`/admin/${slug}`}
                  className={`mb-1 flex text-xs items-center gap-2 rounded-md px-3 py-2 ${pathname.includes(`/${slug}`) ? "bg-[#006948] font-bold text-white" : "text-[#4d5b50] hover:bg-[#eff7ed]"}`}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 rounded-lg bg-[#edf6e9] p-3 h-2/12">
          <b className="text-[#006948]">● Ca sáng: 06:00 - 14:00</b>
          <p>
            ▣ Kho Tổng Đà Lạt
            <br />
            　Chi nhánh Quận 3
          </p>
          <Link
            className="block rounded bg-[#006948] py-2 text-center font-bold text-white"
            href="/admin/pos"
          >
            ⚡ Mở POS Bán Hàng
          </Link>
        </div>
      </aside>
      <div className="w-6/7 ml-auto">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[#dfe8dd] bg-white px-4">
          <div className="flex-1 rounded-lg bg-[#f1f5ee] px-3 py-2 text-xs text-[#68766b]">
            ⌕　Tìm nhanh mã đơn, SKU nông sản, khách hàng　⌘K
          </div>
          <Link
            href="/admin/pos"
            className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white"
          >
            ＋ Tạo đơn (F2)
          </Link>
          <button className="rounded-lg bg-[#f1f5ee] px-3 py-2 text-xs">
            ▣ Nhập kho
          </button>
          <span className="text-xs">♧　♧</span>
          <AdminAccountMenu />
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
