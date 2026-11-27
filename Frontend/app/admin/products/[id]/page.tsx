"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader, Panel, StatusBadge } from "../../../../components/admin/admin-ui";
import { formatCurrency } from "../../../../lib/formatters";
import { productRepository } from "../../../../services/products/product.repository";
import type { Product } from "../../../../types/api";

function getErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { detail?: string } } }).response;
  return response?.data?.detail ??
    (error instanceof Error ? error.message : "Không thể tải thông tin sản phẩm.");
}

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [loadedProductId, setLoadedProductId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    productRepository.getProductById(id)
      .then((result) => {
        if (!active) return;
        setProduct(result);
        setSelectedImage(
          result.images?.find((image) => image.isMain)?.imageUrl ??
          result.mainImageUrl ??
          result.images?.[0]?.imageUrl ??
          ""
        );
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) {
          setProduct(null);
          setError(getErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (active) setLoadedProductId(id);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const loading = loadedProductId !== id;
  if (loading) {
    return <div className="rounded-xl bg-white p-12 text-center text-sm text-[#66736a]">Đang tải thông tin sản phẩm...</div>;
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Link href="/admin/products" className="text-sm font-semibold text-[#006948] hover:underline">← Quay lại danh sách</Link>
        <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">{error || "Không tìm thấy sản phẩm."}</div>
      </div>
    );
  }

  const images = product.images ?? [];
  const gallery = images.length
    ? images
    : product.mainImageUrl
      ? [{ id: "main", imageUrl: product.mainImageUrl, isMain: true, sortOrder: 0 }]
      : [];

  return (
    <div className="space-y-5">
      <Link href="/admin/products" className="text-sm font-semibold text-[#006948] hover:underline">← Quay lại danh sách sản phẩm</Link>
      <PageHeader
        eyebrow="NÔNG SẢN & KHO　›　CHI TIẾT SẢN PHẨM"
        title={product.name}
        description={`SKU: ${product.code}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge tone={product.isActive ? "green" : "gray"}>
              {product.isActive ? "Đang bán" : "Ngừng bán"}
            </StatusBadge>
            <Link href="/admin/products" className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
              Quản lý sản phẩm
            </Link>
          </div>
        }
      />
      {error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
        <Panel title="Hình ảnh sản phẩm">
          {selectedImage ? (
            <div className="space-y-3">
              <div
                role="img"
                aria-label={product.name}
                className="aspect-square w-full rounded-xl bg-[#f1f6ee] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${selectedImage}")` }}
              />
              {gallery.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {gallery.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      aria-label={image.isMain ? "Ảnh chính" : "Xem ảnh sản phẩm"}
                      aria-pressed={selectedImage === image.imageUrl}
                      onClick={() => setSelectedImage(image.imageUrl)}
                      className={`h-16 w-16 rounded-lg border-2 bg-cover bg-center ${selectedImage === image.imageUrl ? "border-[#006948]" : "border-transparent"}`}
                      style={{ backgroundImage: `url("${image.imageUrl}")` }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid aspect-square place-items-center rounded-xl bg-[#f1f6ee] text-sm text-[#66736a]">Chưa có hình ảnh</div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Thông tin kinh doanh">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs text-[#66736a]">Danh mục</dt><dd className="mt-1 font-semibold">{product.categoryName}</dd></div>
              <div><dt className="text-xs text-[#66736a]">Đơn vị tính</dt><dd className="mt-1 font-semibold">{product.unitName}</dd></div>
              <div><dt className="text-xs text-[#66736a]">Giá vốn</dt><dd className="mt-1 font-semibold">{formatCurrency(product.costPrice)}</dd></div>
              <div><dt className="text-xs text-[#66736a]">Giá bán</dt><dd className="mt-1 font-semibold text-[#006948]">{formatCurrency(product.sellingPrice)}</dd></div>
              <div><dt className="text-xs text-[#66736a]">Cảnh báo tồn kho</dt><dd className="mt-1 font-semibold">{product.minStockAlert}</dd></div>
              <div><dt className="text-xs text-[#66736a]">Hạn sử dụng</dt><dd className="mt-1 font-semibold">{product.expiryDays} ngày</dd></div>
              <div><dt className="text-xs text-[#66736a]">Sản phẩm nổi bật</dt><dd className="mt-1 font-semibold">{product.isFeatured ? "Có" : "Không"}</dd></div>
              <div><dt className="text-xs text-[#66736a]">Ngày tạo</dt><dd className="mt-1 font-semibold">{new Date(product.createdAt).toLocaleDateString("vi-VN")}</dd></div>
            </dl>
          </Panel>
          <Panel title="Mô tả">
            {product.shortDescription && <p className="mb-3 font-medium">{product.shortDescription}</p>}
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#536156]">{product.description || "Chưa có mô tả sản phẩm."}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
