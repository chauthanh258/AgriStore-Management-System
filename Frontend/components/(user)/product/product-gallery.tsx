import { useState } from "react";
import { fallbackImage } from "../../../lib/formatters";
import type { Product } from "../../../types/api";

export function ProductGallery({ product }: { product: Product }) {
  const [selected, setSelected] = useState(0);
  const gallery = product.images?.map((image) => image.imageUrl) ?? [
    product.mainImageUrl || fallbackImage
  ];
  return (
    <div>
      <div
        className="relative h-[420px] rounded-xl bg-cover bg-center"
        style={{ backgroundImage: `url(${gallery[selected]})` }}
      >
        <span className="absolute left-4 top-4 rounded bg-[var(--green)] px-2 py-1 text-xs text-white">
          ● VietGAP Certified
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        {gallery.map((image, index) => (
          <button
            key={image}
            onClick={() => setSelected(index)}
            className={`h-16 w-20 rounded-lg border-2 bg-cover bg-center ${selected === index ? "border-[var(--green)]" : "border-transparent"}`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
      </div>
    </div>
  );
}
