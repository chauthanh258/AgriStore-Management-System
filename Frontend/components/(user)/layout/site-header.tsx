"use client";

import Link from "next/link";
import { useCart } from "../../../providers/cart-provider";

export function SiteHeader() {
  const { count } = useCart();
  return (
    <header className="border-b border-[var(--line)] bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-6">
        <Link
          href="/"
          className="flex min-w-[175px] items-center gap-2 text-[var(--green)]"
        >
          <span className="text-xl">✦</span>
          <span>
            <b className="block text-lg">AgriStore</b>
            <small className="block text-[9px] text-[var(--muted)]">
              Nông sản & Hữu cơ Đà Lạt
            </small>
          </span>
        </Link>
        <div className="hidden h-9 flex-1 items-center gap-2 rounded-lg bg-[#f0f5ec] px-3 text-xs text-[var(--muted)] md:flex">
          <span>⌕</span>
          <span className="flex-1">
            Tìm kiếm rau hữu cơ, trái cây tươi, hạt giống...
          </span>
          <b className="rounded-md bg-[var(--green)] px-3 py-1 text-white">
            Tìm
          </b>
        </div>
        <span className="hidden text-[10px] leading-4 text-[var(--muted)] lg:block">
          ☎ Hotline tư vấn
          <br />
          <b className="text-[#c44a27]">1900 6868</b>
        </span>
        <Link
          href="/gio-hang"
          className="rounded-lg bg-[#f0f5ec] px-3 py-2 text-xs"
        >
          🛒 Giỏ hàng{" "}
          <strong className="rounded-full bg-[#ef6c2f] px-1 text-[10px] text-white">
            {count}
          </strong>
        </Link>
        <Link
          href="/tai-khoan"
          className="grid h-8 w-8 place-items-center rounded-full bg-[#f8caa4] text-xs font-bold text-[#7b3d24]"
        >
          MA
        </Link>
      </div>
      <nav className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-6 text-xs text-[#526258]">
        <Link
          href="/san-pham"
          className="rounded-md bg-[var(--mint)] px-3 py-2 font-bold text-[var(--deep)]"
        >
          ▦ Tất cả danh mục⌄
        </Link>
        <Link href="/">Trang chủ</Link>
        <Link href="/san-pham?category=cat-rau">Rau củ hữu cơ</Link>
        <Link href="/san-pham?category=cat-trai">Trái cây tươi</Link>
        <Link href="/san-pham?featured=true">Bán chạy</Link>
        <span className="ml-auto hidden font-bold text-[var(--green)] md:block">
          ♧ Chuẩn VietGAP 100%
        </span>
      </nav>
    </header>
  );
}
