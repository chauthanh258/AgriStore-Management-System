"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ProductFilters } from "../../../components/(user)/product/product-filters";
import { ProductGrid } from "../../../components/(user)/product/product-grid";
import { categories, products } from "../../../data/mock";
import { useCart } from "../../../providers/cart-provider";
import { productRepository } from "../../../services/products/product.repository";

function CatalogContent() {
  const params = useSearchParams();
  const { add } = useCart();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(products);
  const [loading, setLoading] = useState(false);
  const category = params.get("category");
  const featured = params.get("featured");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      productRepository
        .getProducts({
          search: query,
          categoryId: category ?? undefined,
          isFeatured: featured === "true" ? true : undefined
        })
        .then((result) => setItems(result.items))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [query, category, featured]);
  return (
    <main className="mx-auto min-h-[600px] max-w-7xl px-6 py-6">
      <p className="mb-5 text-[11px] text-[var(--muted)]">
        Trang chủ　›　Danh mục　›　<b>Rau củ tươi chuẩn VietGAP</b>
      </p>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[var(--green)]">
            TƯƠI MỖI NGÀY, TỐT CHO SỨC KHỎE
          </span>
          <h1 className="my-2 text-3xl font-bold">Rau Củ Tươi Chuẩn VietGAP</h1>
          <p className="text-[var(--muted)]">
            Được canh tác theo tiêu chuẩn vệ sinh hữu cơ, thu hái tại vườn trước
            06:00 sáng mỗi ngày.
          </p>
        </div>
        <div className="flex gap-2">
          <b className="rounded-lg border border-[var(--line)] bg-white px-6 py-4 text-center text-xl text-[var(--green)]">
            48
            <small className="block text-[10px] font-normal text-[var(--muted)]">
              Sản phẩm sẵn có
            </small>
          </b>
          <b className="rounded-lg border border-[var(--line)] bg-white px-6 py-4 text-center text-xl text-[var(--green)]">
            100%
            <small className="block text-[10px] font-normal text-[var(--muted)]">
              Đạt chuẩn an toàn
            </small>
          </b>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <ProductFilters categories={categories} selectedCategory={category} />
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              className="flex-1 rounded-lg border border-[var(--line)] bg-white p-3 text-sm outline-[var(--green)]"
              placeholder="Tìm kiếm sản phẩm..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="text-xs text-[var(--muted)]">
              Đang hiển thị {items.length} sản phẩm
            </span>
          </div>
          {loading ? (
            <div className="rounded-xl bg-white p-20 text-center text-[var(--muted)]">
              Đang tải sản phẩm...
            </div>
          ) : items.length ? (
            <ProductGrid products={items} onAdd={add} />
          ) : (
            <div className="rounded-xl bg-white p-20 text-center text-[var(--muted)]">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={<div className="p-20 text-center">Đang tải sản phẩm...</div>}
    >
      <CatalogContent />
    </Suspense>
  );
}
