import type { Product } from "../../../types/api";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  onAdd
}: {
  products: Product[];
  onAdd: (product: Product) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}
