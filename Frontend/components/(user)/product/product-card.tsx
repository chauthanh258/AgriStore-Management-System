import Link from "next/link";
import { fallbackImage, formatCurrency } from "../../../lib/formatters";
import type { Product } from "../../../types/api";

export function ProductCard({
  product,
  onAdd
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  return (
    <article className="group flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/san-pham/${product.id}`}>
        <div
          className="relative aspect-video overflow-hidden rounded-lg bg-cover bg-center"
          style={{
            backgroundImage: `url(${product.mainImageUrl || fallbackImage})`
          }}
        >
          <span className="absolute left-2 top-2 rounded-full bg-[var(--green)] px-2 py-1 text-[10px] font-semibold text-white">
            {product.isFeatured ? "Bán chạy" : "Nông sản tươi"}
          </span>
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-lg text-[var(--muted)]">
            ♡
          </span>
        </div>
        <small className="mt-3 block text-[9px] tracking-wide text-[var(--muted)]">
          MÃ: {product.code}
        </small>
        <h3 className="mt-1 line-clamp-1 text-base font-semibold transition group-hover:text-[var(--green)]">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">
          {product.shortDescription}
        </p>
      </Link>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <b className="text-lg text-[#b84b22]">
            {formatCurrency(product.sellingPrice)}
          </b>
          <small className="block text-[10px] text-[var(--muted)]">
            {product.unitName}
          </small>
        </div>
        <button
          type="button"
          onClick={() => onAdd(product)}
          className="rounded-lg bg-[var(--green)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--deep)]"
        >
          🛒 Mua
        </button>
      </div>
    </article>
  );
}
