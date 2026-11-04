import type { Category } from "../../../types/api";

export function ProductFilters({
  categories,
  selectedCategory,
  minPrice,
  maxPrice,
  onCategoryChange,
  onPriceChange,
  onReset,
  onApply
}: {
  categories: Category[];
  selectedCategory: string | null;
  minPrice?: number;
  maxPrice?: number;
  onCategoryChange: (id: string | null) => void;
  onPriceChange: (minPrice?: number, maxPrice?: number) => void;
  onReset: () => void;
  onApply: () => void;
}) {
  const priceRanges = [
    { label: "Dưới 50.000 đ", minPrice: undefined, maxPrice: 50000 },
    { label: "50.000 - 100.000 đ", minPrice: 50000, maxPrice: 100000 },
    { label: "100.000 - 200.000 đ", minPrice: 100000, maxPrice: 200000 },
    { label: "Trên 200.000 đ", minPrice: 200000, maxPrice: undefined }
  ];

  return (
    <aside className="rounded-xl bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-semibold">⚱ Bộ Lọc Tìm Kiếm</h3>
        <button className="text-xs text-[var(--muted)] hover:text-[var(--green)]" onClick={onReset}>
          Đặt lại
        </button>
      </div>
      <b className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Danh mục nông sản</b>
      <div className="mt-2 space-y-1">
        {categories.map((category) => (
          <label
            className={`flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs transition ${
              selectedCategory === category.id
                ? "bg-[var(--mint)] font-semibold text-[var(--green)]"
                : "text-[var(--muted)] hover:bg-[var(--bg)]"
            }`}
            key={category.id}
          >
            <span>
              <input
                className="mr-2 accent-[var(--green)]"
                type="checkbox"
                checked={selectedCategory === category.id}
                onChange={() => onCategoryChange(selectedCategory === category.id ? null : category.id)}
              />
              {category.name}
            </span>
          </label>
        ))}
      </div>
      <b className="mt-6 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Khoảng giá (VNĐ)</b>
      <div className="mt-2 space-y-2">
        {priceRanges.map((range) => (
          <label className="block cursor-pointer text-xs text-[var(--muted)]" key={range.label}>
            <input
              className="mr-2 accent-[var(--green)]"
              type="checkbox"
              checked={minPrice === range.minPrice && maxPrice === range.maxPrice}
              onChange={() =>
                onPriceChange(
                  minPrice === range.minPrice && maxPrice === range.maxPrice
                    ? undefined
                    : range.minPrice,
                  minPrice === range.minPrice && maxPrice === range.maxPrice
                    ? undefined
                    : range.maxPrice
                )
              }
            />
            {range.label}
          </label>
        ))}
      </div>
      <b className="mt-6 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Đơn vị tính</b>
      <div className="mt-2 flex flex-wrap gap-2">
        {["Kg", "Hộp", "Bó", "Túi", "Thùng"].map((unit) => (
          <span className="rounded-md bg-[var(--bg)] px-2 py-1 text-[10px] text-[var(--muted)]" key={unit}>
            {unit}
          </span>
        ))}
      </div>
      <button
        className="mt-6 w-full rounded-lg bg-[var(--green)] px-3 py-3 text-xs font-bold text-white hover:bg-[var(--deep)]"
        onClick={onApply}
      >
        ✓ Áp dụng bộ lọc
      </button>
    </aside>
  );
}
