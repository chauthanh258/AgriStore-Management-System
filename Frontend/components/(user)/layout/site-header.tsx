"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../../../providers/cart-provider";
import { categoryRepository } from "../../../services/categories/category.repository";
import { productRepository } from "../../../services/products/product.repository";
import { fallbackImage, formatCurrency } from "../../../lib/formatters";
import type { Category, Product } from "../../../types/api";
import { AccountMenu } from "./account-menu";

export function SiteHeader() {
  const { count } = useCart();
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

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
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      productRepository
        .getProducts({ search: normalizedQuery, pageSize: 5 })
        .then((result) => {
          if (!active) return;
          setSuggestions(result.items);
          setShowSuggestions(true);
        })
        .catch(() => {
          if (!active) return;
          setSuggestions([]);
          setShowSuggestions(false);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function closeSuggestions() {
    setShowSuggestions(false);
  }

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
        <div ref={searchRef} className="relative hidden flex-1 md:block">
          <div className="flex h-9 items-center gap-2 rounded-lg bg-[#f0f5ec] px-3 text-xs text-[var(--muted)]">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Tìm kiếm sản phẩm"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--muted)]"
              placeholder="Tìm kiếm rau hữu cơ, trái cây tươi, hạt giống..."
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (nextQuery.trim().length < 2) {
                  setSuggestions([]);
                  setSearching(false);
                  setShowSuggestions(false);
                } else {
                  setSearching(true);
                  setShowSuggestions(true);
                }
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setShowSuggestions(true);
              }}
            />
            <button
              type="button"
              className="rounded-md bg-[var(--green)] px-3 py-1 text-white"
              onClick={() => setShowSuggestions(query.trim().length >= 2)}
            >
              Tìm
            </button>
          </div>
          {showSuggestions && (
            <div className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-lg">
              {searching ? (
                <p className="p-4 text-xs text-[var(--muted)]">
                  Đang tìm sản phẩm...
                </p>
              ) : suggestions.length ? (
                <ul>
                  {suggestions.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/san-pham/${product.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-[#f0f5ec]"
                        onClick={closeSuggestions}
                      >
                        <span
                          className="h-12 w-12 shrink-0 rounded-md bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${product.mainImageUrl || fallbackImage})`
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-xs text-[var(--deep)]">
                            {product.name}
                          </b>
                          <small className="text-[var(--muted)]">
                            {product.unitName}
                          </small>
                        </span>
                        <strong className="text-xs text-[#d45b23]">
                          {formatCurrency(product.sellingPrice)}
                        </strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-xs text-[var(--muted)]">
                  Không tìm thấy sản phẩm phù hợp.
                </p>
              )}
            </div>
          )}
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
        <AccountMenu />
      </div>
      <nav className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-6 text-xs text-[#526258]">
        <Link
          href="/san-pham"
          className="rounded-md bg-[var(--mint)] px-3 py-2 font-bold text-[var(--deep)]"
        >
          ▦ Tất cả danh mục⌄
        </Link>
        <Link href="/">Trang chủ</Link>
        {categories.map((category) => (
          <Link key={category.id} href={`/san-pham?category=${category.id}`}>
            {category.name}
          </Link>
        ))}
        <Link href="/san-pham?featured=true">Bán chạy</Link>
        <span className="ml-auto hidden font-bold text-[var(--green)] md:block">
          ♧ Chuẩn VietGAP 100%
        </span>
      </nav>
    </header>
  );
}
