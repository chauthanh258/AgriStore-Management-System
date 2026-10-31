"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../providers/auth-provider";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "A"
  );
}

export function AccountMenu() {
  const { session, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (loading)
    return (
      <span
        className="h-8 w-20 animate-pulse rounded-full bg-[#f0f5ec]"
        aria-label="Đang tải tài khoản"
      />
    );
  if (!session)
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/dang-ky"
          className="rounded-lg border border-[#b9d6c1] px-2.5 py-2 text-[11px] font-bold text-[var(--green)] sm:px-3 sm:text-xs"
        >
          Đăng ký
        </Link>
        <Link
          href="/dang-nhap"
          className="rounded-lg bg-[var(--green)] px-2.5 py-2 text-[11px] font-bold text-white sm:px-3 sm:text-xs"
        >
          Đăng nhập
        </Link>
      </div>
    );

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    window.location.replace("/");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Mở menu tài khoản"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full p-1 transition hover:bg-[#f0f5ec]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f8caa4] text-xs font-black text-[#7b3d24] ring-2 ring-white">
          {initials(session.fullName)}
        </span>
        <span className="hidden max-w-24 truncate text-left text-[10px] sm:block">
          <b className="block truncate">{session.fullName}</b>
          <small className="text-[var(--muted)]">Tài khoản của tôi</small>
        </span>
        <span className="hidden text-[10px] text-[#66736a] sm:block">
          {open ? "⌃" : "⌄"}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-30 w-64 overflow-hidden rounded-2xl border border-[#dfe8dd] bg-white p-2 shadow-xl shadow-[#1d4b3220]"
        >
          <div className="flex items-center gap-3 rounded-xl bg-[#f0f8ed] p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f8caa4] text-xs font-black text-[#7b3d24]">
              {initials(session.fullName)}
            </span>
            <div className="min-w-0">
              <b className="block truncate text-xs">{session.fullName}</b>
              <span className="block truncate text-[10px] text-[#66736a]">
                {session.email}
              </span>
            </div>
          </div>
          <div className="mt-2 border-t border-[#edf2ea] pt-2">
            <Link
              role="menuitem"
              href="/tai-khoan"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-[#35443a] hover:bg-[#f0f5ec]"
            >
              <span>♙</span>
              <span>
                <b className="block">Thông tin cá nhân</b>
                <small className="text-[10px] text-[#7a857c]">
                  Hồ sơ và địa chỉ nhận hàng
                </small>
              </span>
            </Link>
            <Link
              role="menuitem"
              href="/tai-khoan#don-hang"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-[#35443a] hover:bg-[#f0f5ec]"
            >
              <span>▣</span>
              <span>
                <b className="block">Thông tin đơn hàng</b>
                <small className="text-[10px] text-[#7a857c]">
                  Theo dõi đơn và lịch sử mua
                </small>
              </span>
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => void handleLogout()}
              className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-[#edf2ea] px-3 py-3 text-left text-xs text-red-600 hover:bg-red-50"
            >
              <span>⇥</span>
              <b>Đăng xuất</b>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
