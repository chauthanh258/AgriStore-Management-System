"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DataTable, PageHeader, StatusBadge } from "./admin-ui";

type Row = { id: string; search?: string; status?: string };
export function ResourcePage({
  eyebrow,
  title,
  description,
  action,
  headers,
  rows,
  columns,
  searchPlaceholder = "Tìm kiếm nhanh..."
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  headers: string[];
  rows: Row[];
  columns: Array<(row: Row) => ReactNode>;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          !query ||
          (row.search ?? "").toLowerCase().includes(query.toLowerCase())
      ),
    [query, rows]
  );
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
      />
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-[#dfe8dd] bg-white p-3">
        <input
          className="min-w-[220px] flex-1 rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <select className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs">
          <option>Tất cả trạng thái</option>
          <option>Đang hoạt động</option>
          <option>Đang chờ</option>
        </select>
        <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
          ＋ Tạo mới
        </button>
      </div>
      <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
        <div className="mb-3 flex justify-between text-xs text-[#66736a]">
          <span>
            Danh sách <b className="text-[#006948]">{filtered.length}</b>
          </span>
          <span>Đồng bộ 2 phút trước</span>
        </div>
        <DataTable headers={headers}>
          {filtered.map((row) => (
            <tr className="hover:bg-[#f8fbf7]" key={row.id}>
              {columns.map((column, index) => (
                <td className="px-3 py-3" key={`${row.id}-${index}`}>
                  {column(row)}
                </td>
              ))}
            </tr>
          ))}
        </DataTable>
        <div className="mt-4 flex justify-end gap-2 text-xs">
          <button
            className="rounded border px-3 py-1"
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            ‹
          </button>
          <span className="rounded bg-[#006948] px-3 py-1 text-white">
            {page}
          </span>
          <button
            className="rounded border px-3 py-1"
            onClick={() => setPage(page + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </>
  );
}
export function statusTone(
  status?: string
): "green" | "amber" | "red" | "blue" | "gray" {
  if (!status) return "gray";
  if (["Completed", "Active", "Paid", "Received"].includes(status))
    return "green";
  if (["Pending", "Processing", "QualityCheck", "Scheduled"].includes(status))
    return "amber";
  if (["Cancelled", "Expired", "Failed"].includes(status)) return "red";
  if (["Shipping", "Draft"].includes(status)) return "blue";
  return "gray";
}
export { StatusBadge };
