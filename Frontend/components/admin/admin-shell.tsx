"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Home,
  LayoutGrid,
  List,
  Package,
  Warehouse,
  Truck,
  Users,
  MessageSquare,
  Ticket,
  BarChart3,
  UserCog,
  Sparkles,
  Search,
  Keyboard,
  Plus,
  Leaf,
} from "lucide-react";
import { AdminAccountMenu } from "./admin-account-menu";

const groups = [
  { title: "TỔNG QUAN", links: [["dashboard", Home, "Tổng quan"]] },
  {
    title: "BÁN HÀNG",
    links: [
      ["pos", LayoutGrid, "Bán hàng tại quầy (POS)"],
      ["orders", List, "Quản lý đơn hàng"]
    ]
  },
  {
    title: "NÔNG SẢN & KHO",
    links: [
      ["products", Package, "Danh mục & Sản phẩm"],
      ["inventory", Warehouse, "Kho & Tồn kho"],
      ["purchase-orders", Truck, "Nhà cung cấp & Nhập hàng"]
    ]
  },
  {
    title: "KHÁCH HÀNG & MARKETING",
    links: [
      ["customers", Users, "Khách hàng & Điểm"],
      ["reviews", MessageSquare, "Quản lý đánh giá"],
      ["vouchers", Ticket, "Khuyến mãi & Voucher"]
    ]
  },
  {
    title: "HỆ THỐNG",
    links: [
      ["reports", BarChart3, "Báo cáo & Thống kê"],
      ["staff", UserCog, "Nhân viên & Phân quyền"]
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
          <Sparkles className="h-6 w-6" />
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
              {group.links.map(([slug, Icon, label]) => (
                <Link
                  key={slug}
                  href={`/admin/${slug}`}
                  className={`mb-1 flex text-xs items-center gap-2 rounded-md px-3 py-2 ${pathname.includes(`/${slug}`) ? "bg-[#006948] font-bold text-white" : "text-[#4d5b50] hover:bg-[#eff7ed]"}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 rounded-lg bg-[#edf6e9] p-3 h-2/12">
          <b className="text-[#006948]">● Ca sáng: 06:00 - 14:00</b>
          <p>
            <LayoutGrid className="inline h-3 w-3 align-middle mr-1" /> Kho Tổng Đà Lạt
            <br />
            　Chi nhánh Quận 3
          </p>
          <Link
            className="block rounded bg-[#006948] py-2 text-center font-bold text-white"
            href="/admin/pos"
          >
            <Leaf className="inline h-4 w-4 align-middle mr-1" /> Mở POS Bán Hàng
          </Link>
        </div>
      </aside>
      <div className="w-6/7 ml-auto">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[#dfe8dd] bg-white px-4">
          <div className="flex-1 rounded-lg bg-[#f1f5ee] px-3 py-2 text-xs text-[#68766b] flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>Tìm nhanh mã đơn, SKU nông sản, khách hàng</span>
            <Keyboard className="h-3 w-3" />
            <kbd className="px-1.5 py-0.5 text-[9px] bg-white border rounded">K</kbd>
          </div>
          <Link
            href="/admin/pos"
            className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Tạo đơn (F2)
          </Link>
          <button className="rounded-lg bg-[#f1f5ee] px-3 py-2 text-xs flex items-center gap-1">
            <LayoutGrid className="h-4 w-4" />
            Nhập kho
          </button>
          <Leaf className="h-4 w-4 text-[#006948]" />
          <AdminAccountMenu />
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
