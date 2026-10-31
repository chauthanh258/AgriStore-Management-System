"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../providers/auth-provider";
import { getAuthError } from "./auth-error";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await login(email, password);
      const returnUrl = new URLSearchParams(window.location.search).get(
        "returnUrl"
      );
      const safeReturnUrl =
        returnUrl?.startsWith("/admin") &&
        session.roles.some((role) =>
          ["Admin", "Manager", "Staff"].includes(role)
        )
          ? returnUrl
          : null;
      window.location.replace(
        safeReturnUrl ??
          (session.roles.some((role) =>
            ["Admin", "Manager", "Staff"].includes(role)
          )
            ? "/admin/dashboard"
            : "/")
      );
    } catch (submitError) {
      setError(
        getAuthError(submitError, "Email hoặc mật khẩu chưa chính xác.")
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="mb-7">
        <span className="rounded-full bg-[#d1fae5] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#065f46]">
          Chào mừng trở lại
        </span>
        <h1 className="mt-4 text-3xl font-black text-[#182018]">
          Đăng nhập vào
          <br />
          <span className="text-[#006948]">khu vườn của bạn.</span>
        </h1>
        <p className="mt-3 text-sm text-[#66736a]">
          Quản lý đơn hàng, điểm thưởng và những bữa ăn tươi lành.
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          ⚠ {error}
        </div>
      )}
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-xs font-bold text-[#536156]">
          Email
          <input
            className="mt-2 w-full rounded-xl border border-[#cbd8cc] px-4 py-3 text-sm outline-none transition focus:border-[#006948] focus:ring-4 focus:ring-[#d1fae5]"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@example.com"
          />
        </label>
        <label className="block text-xs font-bold text-[#536156]">
          Mật khẩu
          <div className="mt-2 flex rounded-xl border border-[#cbd8cc] focus-within:border-[#006948] focus-within:ring-4 focus-within:ring-[#d1fae5]">
            <input
              className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="px-3 text-xs text-[#66736a]"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </label>
        <div className="flex justify-end">
          <Link
            href="/quen-mat-khau"
            className="text-xs font-bold text-[#006948]"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <button
          disabled={loading}
          className="w-full rounded-xl bg-[#006948] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#006948]/20 transition hover:bg-[#00563b] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Đang kết nối..." : "Đăng nhập →"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#66736a]">
        Chưa có tài khoản?{" "}
        <Link href="/dang-ky" className="font-bold text-[#006948]">
          Tạo tài khoản mới
        </Link>
      </p>
    </>
  );
}
