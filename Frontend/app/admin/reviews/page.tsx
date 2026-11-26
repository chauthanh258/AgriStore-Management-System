"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Panel, StatusBadge } from "../../../components/admin/admin-ui";
import { productRepository } from "../../../services/products/product.repository";
import {
  deleteProductReview,
  getProductReviews,
  setProductReviewApproval
} from "../../../services/reviews/review.service";
import type { Product, ProductReview } from "../../../types/api";

const pageSize = 20;
type ReviewFilter = "all" | "pending" | "approved";

function getErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { detail?: string } } }).response;
  return response?.data?.detail ??
    (error instanceof Error ? error.message : "Không thể thực hiện yêu cầu.");
}

export default function ReviewsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadedReviewKey, setLoadedReviewKey] = useState("");
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      productRepository.getProducts({
        page: 1,
        pageSize: 100,
        search: productSearch.trim() || undefined
      })
        .then((result) => {
          if (!active) return;
          setProducts(result.items);
          setProductId((current) => {
            if (result.items.some((item) => item.id === current)) return current;
            return result.items[0]?.id || "";
          });
          if (!result.items.length) {
            setReviews([]);
            setTotalCount(0);
            setTotalPages(1);
          }
          setError("");
        })
        .catch((loadError: unknown) => {
          if (active) setError(getErrorMessage(loadError));
        })
        .finally(() => {
          if (active) setLoadingProducts(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [productSearch]);

  useEffect(() => {
    if (!productId) return;

    let active = true;
    const requestKey = `${productId}:${page}`;
    getProductReviews(productId, { page, pageSize, includePending: true })
      .then((result) => {
        if (!active) return;
        setReviews(result.items);
        setTotalCount(result.totalCount);
        setTotalPages(Math.max(result.totalPages, 1));
        setLoadedReviewKey(requestKey);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(getErrorMessage(loadError));
          setLoadedReviewKey(requestKey);
        }
      });
    return () => {
      active = false;
    };
  }, [page, productId]);
  const loadingReviews = Boolean(productId) && loadedReviewKey !== `${productId}:${page}`;

  const filteredReviews = useMemo(() => reviews.filter((review) => {
    const matchesStatus =
      filter === "all" ||
      (filter === "pending" && !review.isApproved) ||
      (filter === "approved" && review.isApproved);
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const matchesSearch = !normalizedSearch ||
      review.customerName.toLocaleLowerCase().includes(normalizedSearch) ||
      (review.comment ?? "").toLocaleLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  }), [filter, reviews, search]);

  async function changeApproval(review: ProductReview, isApproved: boolean) {
    setBusyReviewId(review.id);
    setError("");
    try {
      const updated = await setProductReviewApproval(review.id, { isApproved });
      setReviews((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusyReviewId(null);
    }
  }

  async function removeReview(review: ProductReview) {
    if (!window.confirm("Bạn có chắc muốn xóa đánh giá này?")) return;
    setBusyReviewId(review.id);
    setError("");
    try {
      await deleteProductReview(review.id);
      setReviews((current) => current.filter((item) => item.id !== review.id));
      setTotalCount((current) => Math.max(0, current - 1));
      setTotalPages(Math.max(1, Math.ceil(Math.max(0, totalCount - 1) / pageSize)));
      if (reviews.length === 1 && page > 1) setPage((current) => current - 1);
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusyReviewId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="KHÁCH HÀNG & MARKETING　›　QUẢN LÝ ĐÁNH GIÁ"
        title="Duyệt đánh giá sản phẩm"
        description="Đánh giá được tải từ API theo sản phẩm; tìm kiếm và lọc áp dụng trên trang hiện tại."
      />
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Panel title="Lọc đánh giá">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,.8fr)_minmax(240px,1fr)]">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#536156]">
              Tìm sản phẩm
              <input
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setLoadingProducts(true);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-lg border border-[#dfe8dd] px-3 py-2.5 text-sm"
                placeholder="Tên sản phẩm hoặc SKU..."
              />
            </label>
            <label className="block text-xs font-medium text-[#536156]">
              Sản phẩm
              <select
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value);
                  setPage(1);
                }}
                disabled={loadingProducts || !products.length}
                className="mt-1 w-full rounded-lg border border-[#dfe8dd] bg-white px-3 py-2.5 text-sm"
              >
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}
              </select>
            </label>
          </div>
          <label className="text-xs font-medium text-[#536156]">
            Tìm khách hàng hoặc nội dung
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#dfe8dd] px-3 py-2.5 text-sm"
              placeholder="Nhập từ khóa..."
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-[#66736a]">Tìm kiếm và bộ lọc trạng thái chỉ áp dụng cho các đánh giá đang hiển thị ở trang này.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ["all", "Tất cả"],
            ["pending", "Chờ duyệt"],
            ["approved", "Đã duyệt"]
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-4 py-2 text-xs ${filter === key ? "bg-[#006948] font-bold text-white" : "bg-[#f1f6ee] text-[#536156]"}`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-[#66736a]">{totalCount} đánh giá · trang {page}/{totalPages}</span>
        </div>
      </Panel>

      <div className="mt-4">
        <Panel title={`Đánh giá (${filteredReviews.length} trên trang hiện tại)`}>
          {loadingProducts || loadingReviews ? (
            <p className="py-8 text-center text-sm text-[#66736a]">Đang tải đánh giá...</p>
          ) : !productId ? (
            <p className="py-8 text-center text-sm text-[#66736a]">Chưa có sản phẩm để tải đánh giá.</p>
          ) : filteredReviews.length ? (
            <div className="divide-y divide-[#e1e9df]">
              {filteredReviews.map((review) => (
                <article key={review.id} className="flex flex-col gap-4 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-sm">{review.customerName}</b>
                      <StatusBadge tone={review.isApproved ? "green" : "amber"}>
                        {review.isApproved ? "Đã duyệt" : "Chờ duyệt"}
                      </StatusBadge>
                      <span className="text-xs text-[#66736a]">{new Date(review.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                    <p className="mt-1 tracking-widest text-amber-600" aria-label={`${review.rating} trên 5 sao`}>
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536156]">{review.comment || "Khách hàng không để lại nhận xét."}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      disabled={busyReviewId === review.id || review.isApproved}
                      onClick={() => void changeApproval(review, true)}
                      className="rounded-lg bg-[#006948] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Duyệt
                    </button>
                    <button
                      disabled={busyReviewId === review.id || !review.isApproved}
                      onClick={() => void changeApproval(review, false)}
                      className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs disabled:opacity-50"
                    >
                      Gỡ duyệt
                    </button>
                    <button
                      disabled={busyReviewId === review.id}
                      onClick={() => void removeReview(review)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#66736a]">Không có đánh giá nào phù hợp.</p>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-[#e1e9df] pt-4 text-xs text-[#66736a]">
              <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trang trước</button>
              <span>Trang {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trang sau</button>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
