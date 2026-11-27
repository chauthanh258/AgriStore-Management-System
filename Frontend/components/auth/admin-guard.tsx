"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "../../providers/auth-provider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, session, hasRole } = useAuth();
  useEffect(() => {
    if (!loading && !session) {
      const returnUrl = `${window.location.pathname}${window.location.search}`;
      window.location.replace(
        `/dang-nhap?returnUrl=${encodeURIComponent(returnUrl)}`
      );
    }
  }, [loading, session]);
  if (loading || !session)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6fbf2] text-sm text-[#66736a]">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  if (!hasRole("Admin", "Manager", "Staff"))
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6fbf2] p-6">
        <div className="max-w-md rounded-3xl border border-[#dfe8dd] bg-white p-8 text-center shadow-xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fee2e2] text-2xl">
            ⊘
          </div>
          <h1 className="mt-4 text-xl font-bold">
            Bạn không có quyền truy cập
          </h1>
          <p className="mt-2 text-sm text-[#66736a]">
            Khu vực quản trị chỉ dành cho tài khoản nhân viên AgriStore.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#006948] px-5 py-3 text-xs font-bold text-white"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  return children;
}
