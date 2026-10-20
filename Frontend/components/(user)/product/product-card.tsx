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
    <article className="rounded-xl border border-[var(--line)] bg-white p-2">
      <Link href={`/san-pham/${product.id}`}>
        <div
          className="relative h-44 rounded-lg bg-cover bg-center"
          style={{
            backgroundImage: `url(${product.mainImageUrl || fallbackImage})`
          }}
        >
          <span className="absolute left-2 top-2 rounded bg-[var(--green)] px-2 py-1 text-[10px] text-white">
            VietGAP
          </span>
          <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-1">
            ♡
          </span>
        </div>
        <small className="mt-2 block text-[9px] text-[var(--muted)]">
          MÃ: {product.code}
        </small>
        <h3 className="mt-1 text-sm font-semibold">{product.name}</h3>
        <p className="text-[11px] text-[var(--muted)]">
          {product.shortDescription}
        </p>
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <b className="text-base text-[#d45b23]">
            {formatCurrency(product.sellingPrice)}
          </b>
          <small className="text-[10px] text-[var(--muted)]">
            {" "}
            / {product.unitName}
          </small>
        </div>
        <button
          onClick={() => onAdd(product)}
          className="rounded-lg bg-[var(--green)] px-3 py-2 text-[11px] text-white"
        >
          🛒 Mua
        </button>
      </div>
    </article>
  );
}
