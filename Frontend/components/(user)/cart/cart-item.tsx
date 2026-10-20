import type { Product } from "../../../types/api";
import { formatCurrency } from "../../../lib/formatters";

export function CartItem({
  product,
  quantity,
  onUpdate,
  onRemove
}: {
  product: Product;
  quantity: number;
  onUpdate: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[54px_1fr_auto] items-center gap-3 border-t border-[var(--line)] py-4 md:grid-cols-[58px_1fr_100px_110px_100px_25px]">
      <div
        className="h-14 rounded-lg bg-cover bg-center"
        style={{ backgroundImage: `url(${product.mainImageUrl})` }}
      />
      <div>
        <b>{product.name}</b>
        <small className="mt-1 block text-[10px] text-[var(--muted)]">
          {product.unitName}
        </small>
      </div>
      <b className="hidden text-sm md:block">
        {formatCurrency(product.sellingPrice)}
      </b>
      <div className="flex items-center rounded-lg border border-[var(--line)]">
        <button className="px-2 py-1" onClick={() => onUpdate(quantity - 1)}>
          −
        </button>
        <b className="px-2">{quantity}</b>
        <button className="px-2 py-1" onClick={() => onUpdate(quantity + 1)}>
          +
        </button>
      </div>
      <b>{formatCurrency(product.sellingPrice * quantity)}</b>
      <button onClick={onRemove}>⌫</button>
    </div>
  );
}
