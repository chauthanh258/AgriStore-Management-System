"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ProductFilters } from "../../../components/(user)/product/product-filters";
import { ProductGrid } from "../../../components/(user)/product/product-grid";
import { categoryRepository } from "../../../services/categories/category.repository";
import { productRepository } from "../../../services/products/product.repository";
import { useCart } from "../../../providers/cart-provider";
import type { Category, Product, ProductQuery } from "../../../types/api";

const pageSize = 9;

function CatalogContent() {
  const params = useSearchParams();
  const { add } = useCart();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | null>(params.get("category"));
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [sortBy, setSortBy] = useState<ProductQuery["sortBy"]>("createdAt");
  const [sortDirection, setSortDirection] = useState<ProductQuery["sortDirection"]>("desc");

  useEffect(() => {
    let active = true;
    categoryRepository
      .getCategories({ isActive: true })
      .then((result) => {
        if (active) setCategories(result.items);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      productRepository
        .getProducts({
          page,
          pageSize,
          search: query.trim() || undefined,
          categoryId: category ?? undefined,
          minPrice,
          maxPrice,
          isFeatured: params.get("featured") === "true" ? true : undefined,
          sortBy,
          sortDirection
        })
        .then((result) => {
          setItems(result.items);
          setTotalCount(result.totalCount);
          setTotalPages(Math.max(result.totalPages, 1));
        })
        .catch(() => {
          setItems([]);
          setTotalCount(0);
          setTotalPages(1);
          setError(true);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, category, minPrice, maxPrice, sortBy, sortDirection, page, params]);

  const selectedCategoryName = useMemo(
    () => categories.find((item) => item.id === category)?.name,
    [categories, category]
  );

  function resetFilters() {
    setCategory(null);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setQuery("");
    setPage(1);
  }

  function selectCategory(id: string | null) {
    setCategory(id);
    setPage(1);
  }

  function selectPrice(nextMin?: number, nextMax?: number) {
    setMinPrice(nextMin);
    setMaxPrice(nextMax);
    setPage(1);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <p className="mb-4 text-[11px] text-[var(--muted)]">
        Trang chủ　›　Danh mục　›　<b>{selectedCategoryName ?? "Rau củ tươi chuẩn VietGAP"}</b>
      </p>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <span className="text-[10px] font-bold tracking-widest text-[var(--green)]">
            TƯƠI MỖI NGÀY, TỐT CHO SỨC KHỎE
          </span>
          <h1 className="my-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Rau Củ Tươi Chuẩn VietGAP
          </h1>
          <p className="text-xs leading-5 text-[var(--muted)] sm:text-sm">
            Nông sản tươi sạch được tuyển chọn từ các vùng trồng uy tín, đóng gói
            cẩn thận và giao đến bạn mỗi ngày.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl bg-[var(--mint)] px-5 py-3 text-center">
            <b className="block text-xl text-[var(--green)]">{totalCount}</b>
            <small className="text-[10px] text-[var(--muted)]">Sản phẩm sẵn có</small>
          </div>
          <div className="rounded-xl bg-[#fff4ed] px-5 py-3 text-center">
            <b className="block text-xl text-[#a64220]">100%</b>
            <small className="text-[10px] text-[var(--muted)]">Đạt chuẩn an toàn</small>
          </div>
        </div>
      </section>

      <section className="mb-6 flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Bộ lọc:</span>
          {selectedCategoryName && (
            <button className="rounded-full bg-[var(--mint)] px-3 py-1 text-[var(--deep)]" onClick={() => selectCategory(null)}>
              {selectedCategoryName} ×
            </button>
          )}
          {(minPrice !== undefined || maxPrice !== undefined) && (
            <button className="rounded-full bg-[#fff4ed] px-3 py-1 text-[#78350f]" onClick={() => selectPrice()}>
              Khoảng giá ×
            </button>
          )}
          {(selectedCategoryName || minPrice !== undefined || maxPrice !== undefined || query) && (
            <button className="px-2 text-[#a64220] hover:underline" onClick={resetFilters}>Xóa tất cả</button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Sắp xếp theo:
          <select
            className="rounded-lg bg-[var(--bg)] px-3 py-2 text-xs text-[var(--ink)] outline-none"
            value={`${sortBy}-${sortDirection}`}
            onChange={(event) => {
              const [nextSort, nextDirection] = event.target.value.split("-");
              setSortBy(nextSort as ProductQuery["sortBy"]);
              setSortDirection(nextDirection as ProductQuery["sortDirection"]);
              setPage(1);
            }}
          >
            <option value="createdAt-desc">Mới thu hoạch nhất</option>
            <option value="name-asc">Tên A-Z</option>
            <option value="sellingPrice-asc">Giá tăng dần</option>
            <option value="sellingPrice-desc">Giá giảm dần</option>
          </select>
        </label>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ProductFilters
            categories={categories}
            selectedCategory={category}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onCategoryChange={selectCategory}
            onPriceChange={selectPrice}
            onReset={resetFilters}
            onApply={() => setPage(1)}
          />
          <div className="mt-4 rounded-xl bg-[#edf5e9] p-4 text-xs text-[var(--muted)]">
            <b className="text-[var(--green)]">♧ Cam kết nông sản AgriStore</b>
            <p className="mt-2 leading-5">
              Sản phẩm được tuyển chọn, đóng gói cẩn thận và giao đến bạn trong
              điều kiện bảo quản phù hợp.
            </p>
          </div>
        </div>
        <section className="lg:col-span-9">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white p-3 text-sm outline-[var(--green)]"
              placeholder="Tìm kiếm sản phẩm..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <span className="text-xs text-[var(--muted)]">Hiển thị {items.length} / {totalCount} sản phẩm</span>
          </div>
          {loading ? (
            <div className="rounded-xl bg-white p-20 text-center text-sm text-[var(--muted)]">Đang tải sản phẩm...</div>
          ) : error ? (
            <div className="rounded-xl bg-white p-20 text-center text-sm text-[#a64220]">Không thể tải sản phẩm. Vui lòng thử lại.</div>
          ) : items.length ? (
            <>
              <ProductGrid products={items} onAdd={add} />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 text-xs text-[var(--muted)]">
                <span>Trang {page} / {totalPages}</span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-md bg-[var(--bg)] px-3 py-2 disabled:opacity-40">‹</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((value) => (
                    <button key={value} onClick={() => setPage(value)} className={`rounded-md px-3 py-2 ${value === page ? "bg-[var(--green)] text-white" : "bg-[var(--bg)]"}`}>{value}</button>
                  ))}
                  <button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md bg-[var(--bg)] px-3 py-2 disabled:opacity-40">›</button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-white p-20 text-center text-sm text-[var(--muted)]">Không tìm thấy sản phẩm phù hợp.</div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Đang tải sản phẩm...</div>}>
      <CatalogContent />
    </Suspense>
  );
}
