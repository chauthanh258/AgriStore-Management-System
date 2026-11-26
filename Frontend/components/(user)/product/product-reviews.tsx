"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../../providers/auth-provider";
import { createProductReview, getProductReviews } from "../../../services/reviews/review.service";
import type { ProductReview } from "../../../types/api";

const pageSize = 10;

function getErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { detail?: string } } }).response;
  return response?.data?.detail ??
    (error instanceof Error ? error.message : "Không thể thực hiện yêu cầu.");
}

export function ProductReviews({ productId }: { productId: string }) {
  const { hasRole, loading: authLoading, session } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadedKey, setLoadedKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const requestKey = `${productId}:${page}`;
    getProductReviews(productId, { page, pageSize })
      .then((result) => {
        if (!active) return;
        setReviews(result.items);
        setTotalPages(Math.max(result.totalPages, 1));
        setError("");
        setLoadedKey(requestKey);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(getErrorMessage(loadError));
          setLoadedKey(requestKey);
        }
      });
    return () => {
      active = false;
    };
  }, [page, productId]);
  const loading = loadedKey !== `${productId}:${page}`;

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await createProductReview(productId, {
        rating,
        comment: comment.trim() || undefined
      });
      setComment("");
      setRating(5);
      setMessage("Đánh giá đã được gửi và đang chờ quản trị viên duyệt.");
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Đánh giá sản phẩm</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Đánh giá đã được duyệt sẽ hiển thị công khai.</p>
        </div>
        <span className="text-sm text-[var(--muted)]">{reviews.length} đánh giá trên trang này</span>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="mb-4 rounded-lg bg-[#edf6e9] px-4 py-3 text-sm text-[#006948]">{message}</div>}

      {loading ? (
        <p className="py-6 text-sm text-[var(--muted)]">Đang tải đánh giá...</p>
      ) : reviews.length ? (
        <div className="divide-y divide-[var(--line)]">
          {reviews.map((review) => (
            <article key={review.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-sm">{review.customerName}</b>
                <time className="text-xs text-[var(--muted)]" dateTime={review.createdAt}>
                  {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                </time>
              </div>
              <p className="mt-1 tracking-widest text-amber-600" aria-label={`${review.rating} trên 5 sao`}>
                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
              </p>
              {review.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536156]">{review.comment}</p>}
            </article>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-[var(--muted)]">
              <span>Trang {page} / {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Trước</button>
                <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Sau</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="py-4 text-sm text-[var(--muted)]">Chưa có đánh giá được duyệt cho sản phẩm này.</p>
      )}

      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <h3 className="font-semibold">Gửi đánh giá của bạn</h3>
        {authLoading ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Đang kiểm tra tài khoản...</p>
        ) : !session ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Vui lòng{" "}
            <Link
              className="font-semibold text-[var(--green)] underline"
              href={`/dang-nhap?returnUrl=${encodeURIComponent(`/san-pham/${productId}`)}`}
            >
              đăng nhập
            </Link>{" "}
            bằng tài khoản khách hàng để gửi đánh giá.
          </p>
        ) : !hasRole("Customer") ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Chỉ tài khoản khách hàng mới có thể gửi đánh giá.</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-[var(--muted)]">Chỉ khách hàng đã mua và nhận sản phẩm mới được đánh giá; mỗi khách hàng chỉ đánh giá một lần.</p>
            <form onSubmit={submitReview} className="mt-4 space-y-3">
              <label className="block text-sm">
                Số sao
                <select
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="ml-3 rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                >
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}
                </select>
              </label>
              <label className="block text-sm">
                Nhận xét (không bắt buộc)
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 outline-[var(--green)]"
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
