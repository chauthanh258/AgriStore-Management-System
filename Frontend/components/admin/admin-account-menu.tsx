"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../providers/auth-provider";

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

export function AdminAccountMenu() {
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!session) return null;
  const handleLogout = async () => {
    setOpen(false);
    await logout();
    window.location.replace("/dang-nhap");
  };
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-[#f1f5ee]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f8caa4] text-xs font-black text-[#7b3d24] ring-2 ring-white">
          {initials(session.fullName)}
        </span>
        <span className="hidden max-w-36 text-left text-[10px] sm:block">
          <b className="block truncate">{session.fullName}</b>
          <small className="text-[#006948]">{session.roles.join(" · ")}</small>
        </span>
        <span className="text-[10px] text-[#66736a]">{open ? "⌃" : "⌄"}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-2xl border border-[#dfe8dd] bg-white p-2 shadow-xl"
        >
          <div className="flex items-center gap-3 rounded-xl bg-[#f0f8ed] p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f8caa4] text-xs font-black text-[#7b3d24]">
              {initials(session.fullName)}
            </span>
            <div className="min-w-0">
              <b className="block truncate text-xs">{session.fullName}</b>
              <small className="block truncate text-[10px] text-[#66736a]">
                {session.email}
              </small>
            </div>
          </div>
          <div className="mt-2 border-t border-[#edf2ea] pt-2">
            <Link
              role="menuitem"
              href="/admin/thong-tin-ca-nhan"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-xs hover:bg-[#f1f5ee]"
            >
              <b className="block">♙ Thông tin cá nhân</b>
              <small className="text-[#7a857c]">
                Hồ sơ và bảo mật tài khoản
              </small>
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => void handleLogout()}
              className="mt-1 w-full border-t border-[#edf2ea] px-3 py-3 text-left text-xs text-red-600 hover:bg-red-50"
            >
              ⇥　<b>Đăng xuất</b>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
