"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ProductGallery } from "../../../../components/(user)/product/product-gallery";
import { ProductPurchasePanel } from "../../../../components/(user)/product/product-purchase-panel";
import { ProductReviews } from "../../../../components/(user)/product/product-reviews";
import { productRepository } from "../../../../services/products/product.repository";
import type { Product } from "../../../../types/api";

function ProductDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadedProductId, setLoadedProductId] = useState("");
  useEffect(() => {
    let active = true;
    productRepository
      .getProductById(id)
      .then((result) => {
        if (active) setProduct(result);
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoadedProductId(id);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const loading = loadedProductId !== id;
  if (loading)
    return (
      <main className="mx-auto min-h-[600px] max-w-7xl p-20 text-center text-[var(--muted)]">
        Đang tải sản phẩm...
      </main>
    );
  if (!product || !product.isActive)
    return (
      <main className="mx-auto min-h-[600px] max-w-7xl p-20 text-center text-[var(--muted)]">
        {!product ? "Không tìm thấy sản phẩm." : "Sản phẩm hiện không kinh doanh."}
      </main>
    );
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-6">
      <p className="mb-5 text-[11px] text-[var(--muted)]">
        Trang chủ　›　Trái cây tươi　›　<b>{product.name}</b>
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery product={product} />
        <ProductPurchasePanel product={product} />
      </div>
      <section className="mt-10 rounded-xl bg-white p-6">
        <h2 className="text-2xl font-bold">
          Hương Vị Ngọt Thanh Nơi Thung Lũng Cao Nguyên
        </h2>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          {product.description}
        </p>
      </section>
      <ProductReviews productId={product.id} />
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={<main className="p-20 text-center">Đang tải sản phẩm...</main>}
    >
      <ProductDetailContent />
    </Suspense>
  );
}
