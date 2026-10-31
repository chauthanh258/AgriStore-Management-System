"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../providers/auth-provider";
import { getAuthError } from "./auth-error";

export function RegisterForm() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận chưa trùng khớp.");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu cần có ít nhất 8 ký tự.");
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        password: form.password
      });
      window.location.replace("/dang-nhap?registered=1");
    } catch (submitError) {
      setError(
        getAuthError(
          submitError,
          "Không thể tạo tài khoản. Vui lòng kiểm tra thông tin."
        )
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="mb-6">
        <span className="rounded-full bg-[#ffd5a8] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7b3d24]">
          Gia nhập cộng đồng xanh
        </span>
        <h1 className="mt-4 text-3xl font-black text-[#182018]">
          Tạo tài khoản
          <br />
          <span className="text-[#006948]">sống tươi mỗi ngày.</span>
        </h1>
        <p className="mt-3 text-sm text-[#66736a]">
          Lưu địa chỉ, nhận ưu đãi và tích điểm AgriClub.
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
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-xs font-bold text-[#536156]">
          Họ và tên
          <input
            className="mt-1.5 w-full rounded-xl border border-[#cbd8cc] px-4 py-2.5 text-sm outline-none focus:border-[#006948] focus:ring-4 focus:ring-[#d1fae5]"
            required
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#536156]">
            Email
            <input
              className="mt-1.5 w-full rounded-xl border border-[#cbd8cc] px-4 py-2.5 text-sm outline-none focus:border-[#006948] focus:ring-4 focus:ring-[#d1fae5]"
              required
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="ban@example.com"
            />
          </label>
          <label className="block text-xs font-bold text-[#536156]">
            Số điện thoại
            <input
              className="mt-1.5 w-full rounded-xl border border-[#cbd8cc] px-4 py-2.5 text-sm outline-none focus:border-[#006948] focus:ring-4 focus:ring-[#d1fae5]"
              required
              value={form.phoneNumber}
              onChange={(event) => update("phoneNumber", event.target.value)}
              placeholder="0900 000 000"
            />
          </label>
        </div>
        <label className="block text-xs font-bold text-[#536156]">
          Mật khẩu
          <input
            className="mt-1.5 w-full rounded-xl border border-[#cbd8cc] px-4 py-2.5 text-sm outline-none focus:border-[#006948] focus:ring-4 focus:ring-[#d1fae5]"
            required
            minLength={8}
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="Ít nhất 8 ký tự"
          />
        </label>
        <label className="block text-xs font-bold text-[#536156]">
          Xác nhận mật khẩu
          <input
            className="mt-1.5 w-full rounded-xl border border-[#cbd8cc] px-4 py-2.5 text-sm outline-none focus:border-[#006948] focus:ring-4 focus:ring-[#d1fae5]"
            required
            type="password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            placeholder="Nhập lại mật khẩu"
          />
        </label>
        <button
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-[#006948] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#006948]/20 disabled:opacity-60"
        >
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản →"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-[#66736a]">
        Đã có tài khoản?{" "}
        <Link href="/dang-nhap" className="font-bold text-[#006948]">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
