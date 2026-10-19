import type { Category } from "../../../types/api";

export function ProductFilters({
  categories,
  selectedCategory
}: {
  categories: Category[];
  selectedCategory: string | null;
}) {
  return (
    <aside className="hidden rounded-xl border border-[var(--line)] bg-white p-4 lg:block">
      <h3 className="mb-5 font-semibold">⚱ Bộ Lọc Tìm Kiếm</h3>
      <b className="text-[10px]">DANH MỤC NÔNG SẢN</b>
      {categories.map((category) => (
        <label
          className="mt-3 block text-xs text-[var(--muted)]"
          key={category.id}
        >
          <input
            type="checkbox"
            checked={selectedCategory === category.id}
            readOnly
          />{" "}
          {category.name}
          <small className="float-right">(24)</small>
        </label>
      ))}
      <b className="mt-6 block text-[10px]">KHOẢNG GIÁ (VNĐ)</b>
      {["Dưới 50.000 đ", "50.000 - 100.000 đ", "Trên 200.000 đ"].map(
        (label) => (
          <label className="mt-3 block text-xs text-[var(--muted)]" key={label}>
            <input type="checkbox" /> {label}
          </label>
        )
      )}
      <b className="mt-6 block text-[10px]">TIÊU CHUẨN CANH TÁC</b>
      <label className="mt-3 block text-xs text-[var(--muted)]">
        <input type="checkbox" defaultChecked /> Chứng nhận VietGAP
      </label>
      <button className="mt-6 w-full rounded-lg bg-[var(--green)] px-3 py-3 text-xs font-bold text-white">
        ✓ Áp dụng bộ lọc
      </button>
    </aside>
  );
}
