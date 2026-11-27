import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  mode
}: {
  children: ReactNode;
  mode: "login" | "register";
}) {
  return (
    <main
      data-mode={mode}
      className="relative min-h-screen overflow-hidden bg-[#f6fbf2]"
    >
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#b8f2d5] opacity-70 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#ffd5a8] opacity-70 blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_480px] lg:px-10">
        <section className="hidden min-h-[620px] flex-col justify-between rounded-[2rem] bg-[#006948] p-10 text-white shadow-xl lg:flex">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#a7f3d0] text-2xl text-[#006948]">
                ✦
              </span>
              <span>
                <b className="block text-2xl">AgriStore</b>
                <small className="text-[#b8f2d5]">
                  Nông sản tươi lành mỗi ngày
                </small>
              </span>
            </Link>
            <div className="mt-24 max-w-md">
              <p className="mb-4 text-sm font-bold uppercase tracking-[.25em] text-[#a7f3d0]">
                Từ nông trại đến bàn ăn
              </p>
              <h1 className="text-5xl font-black leading-tight">
                Ăn xanh.
                <br />
                Sống lành.
                <br />
                <span className="text-[#ffd39e]">Mỗi ngày.</span>
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-6 text-[#d8f8e7]">
                Nông sản chọn lọc từ những vùng đất tử tế, giao nhanh và tươi
                ngon đến căn bếp của bạn.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-2xl bg-white/10 p-4">
              <b className="block text-xl">100%</b>VietGAP
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <b className="block text-xl">2h</b>Giao tươi
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <b className="block text-xl">24/7</b>Hỗ trợ
            </div>
          </div>
        </section>
        <section className="mx-auto w-full max-w-[480px] rounded-[2rem] border border-[#dfe8dd] bg-white/95 p-6 shadow-xl sm:p-9">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="font-bold text-[#006948]">
              ✦ AgriStore
            </Link>
            <span className="rounded-full bg-[#d1fae5] px-3 py-1 text-[10px] text-[#065f46]">
              Nông sản tươi
            </span>
          </div>
          {children}
          <div className="mt-8 border-t border-[#e7eee4] pt-5 text-center text-[11px] text-[#7a857c]">
            Bằng việc tiếp tục, bạn đồng ý với Điều khoản & Chính sách bảo mật
            của AgriStore.
          </div>
        </section>
      </div>
    </main>
  );
}
