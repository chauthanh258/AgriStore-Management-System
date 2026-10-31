"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ProductGallery } from "../../../../components/(user)/product/product-gallery";
import { ProductPurchasePanel } from "../../../../components/(user)/product/product-purchase-panel";
import { productRepository } from "../../../../services/products/product.repository";
import type { Product } from "../../../../types/api";

function ProductDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  useEffect(() => {
    productRepository
      .getProductById(id)
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [id]);
  if (!product)
    return (
      <main className="mx-auto min-h-[600px] max-w-7xl p-20 text-center text-[var(--muted)]">
        Không tìm thấy sản phẩm.
      </main>
    );
  return (
    <main className="mx-auto w-7xl px-6 py-6">
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
