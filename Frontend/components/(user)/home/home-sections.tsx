"use client";

import Link from "next/link";
import { categories, products } from "../../../data/mock";
import { useCart } from "../../../providers/cart-provider";
import { ProductGrid } from "../product/product-grid";
import { fallbackImage } from "../../../lib/formatters";

export function HomeSections() {
  const { add } = useCart();
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_420px]">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[var(--green)]">
            ✿ TƯƠI SẠCH MỖI NGÀY TỪ NÔNG TRẠI
          </span>
          <h1 className="my-3 text-4xl font-extrabold leading-tight">
            Nông Sản Tươi Ngon Chuẩn VietGAP –<br />
            <em className="text-[var(--green)] not-italic">
              Giao Tận Bếp Trong 2 Giờ
            </em>
          </h1>
          <p className="max-w-xl leading-7 text-[var(--muted)]">
            100% rau củ quả thu hoạch trong ngày từ các vùng trồng sạch tại Đà
            Lạt và Mộc Châu. Giao trọn vị ngon tự nhiên, dinh dưỡng tinh khiết.
          </p>
          <Link
            href="/san-pham"
            className="mt-5 inline-block rounded-lg bg-[var(--green)] px-5 py-3 text-sm font-bold text-white"
          >
            Khám phá nông sản ngay
          </Link>
          <div className="mt-6 grid grid-cols-3 gap-2 text-[10px]">
            <span className="rounded-lg border border-[var(--line)] bg-white p-3">
              ◉<b className="block">Thu hoạch sáng nay</b>
              <small className="text-[var(--muted)]">Tươi mới mỗi ngày</small>
            </span>
            <span className="rounded-lg border border-[var(--line)] bg-white p-3">
              ✓<b className="block">VietGAP & hữu cơ</b>
              <small className="text-[var(--muted)]">Chứng nhận rõ ràng</small>
            </span>
            <span className="rounded-lg border border-[var(--line)] bg-white p-3">
              ϟ<b className="block">Freshship 2-5°C</b>
              <small className="text-[var(--muted)]">Giữ lạnh tươi ngon</small>
            </span>
          </div>
        </div>
        <div
          className="min-h-[310px] rounded-2xl bg-cover bg-center shadow-lg"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1000&q=85)"
          }}
        />
      </section>
      <section className="bg-white px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <span className="text-[10px] font-bold tracking-widest text-[var(--green)]">
            NGUỒN DINH DƯỠNG LÀNH MẠNH
          </span>
          <h2 className="mb-5 mt-1 text-2xl font-bold">
            Danh Mục Nông Sản Nổi Bật
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/san-pham?category=${category.id}`}
                className="rounded-xl bg-[#edf5e9] p-2"
              >
                <div
                  className="h-32 rounded-lg bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${category.image || fallbackImage})`
                  }}
                />
                <b className="mt-2 block">{category.name}</b>
                <small className="text-[var(--muted)]">
                  {category.description}
                </small>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <span className="text-[10px] font-bold tracking-widest text-[var(--green)]">
            ĐƯỢC YÊU THÍCH NHẤT
          </span>
          <h2 className="mb-5 mt-1 text-2xl font-bold">
            Nông Sản Bán Chạy Trong Tuần
          </h2>
          <ProductGrid products={products.slice(0, 4)} onAdd={add} />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-2">
        <div
          className="min-h-[260px] rounded-2xl bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1472141521881-95d0e87e2e39?auto=format&fit=crop&w=1000&q=85)"
          }}
        />
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[var(--green)]">
            ✦ HÀNH TRÌNH TỪ ĐẤT
          </span>
          <h2 className="my-3 text-3xl font-bold">
            Từ Nông Trại Xanh Đến Căn Bếp Hạnh Phúc
          </h2>
          <p className="leading-7 text-[var(--muted)]">
            Mỗi bó rau, trái ngọt tại AgriStore đều là lời hứa về chất lượng và
            sự chăm bón tận tâm. Chúng tôi kết nối bạn với những nông trại minh
            bạch.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--deep)]">
            <span className="rounded-lg border border-[var(--line)] bg-white p-3">
              ✓ Không phân bón hóa học
            </span>
            <span className="rounded-lg border border-[var(--line)] bg-white p-3">
              ⌖ Minh bạch truy xuất nguồn gốc
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
