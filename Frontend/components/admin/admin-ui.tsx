import type { ReactNode } from "react";
import { formatCurrency } from "../../lib/formatters";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <small className="font-bold tracking-widest text-[#006948]">
          {eyebrow}
        </small>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        {description && (
          <p className="mt-1 text-xs text-[#66736a]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
export function KpiGrid({
  items
}: {
  items: Array<{
    label: string;
    value: string | number;
    hint: string;
    tone?: "green" | "amber" | "red" | "blue";
  }>;
}) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          className="rounded-xl border border-[#dfe8dd] bg-white p-4"
          key={item.label}
        >
          <small className="block text-[10px] uppercase text-[#68766b]">
            {item.label}
          </small>
          <b
            className={`mt-2 block text-2xl ${item.tone === "red" ? "text-red-600" : item.tone === "amber" ? "text-amber-600" : item.tone === "blue" ? "text-sky-600" : "text-[#006948]"}`}
          >
            {typeof item.value === "number"
              ? formatCurrency(item.value)
              : item.value}
          </b>
          <small className="mt-2 block text-[10px] text-[#68766b]">
            {item.hint}
          </small>
        </div>
      ))}
    </div>
  );
}
export function Panel({
  title,
  children,
  className = ""
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[#dfe8dd] bg-white p-4 ${className}`}
    >
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}
export function StatusBadge({
  children,
  tone = "green"
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "blue" | "gray";
}) {
  const styles = {
    green: "bg-[#d1fae5] text-[#065f46]",
    amber: "bg-[#fef3c7] text-[#92400e]",
    red: "bg-[#fee2e2] text-[#991b1b]",
    blue: "bg-[#e0f2fe] text-[#075985]",
    gray: "bg-[#eef2ec] text-[#536156]"
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
export function DataTable({
  headers,
  children
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#e1e9df]">
      <table className="w-full min-w-[700px] text-left text-xs">
        <thead className="bg-[#f1f6ee] text-[10px] uppercase text-[#66736a]">
          <tr>
            {headers.map((header) => (
              <th className="px-3 py-3" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e7eee4]">{children}</tbody>
      </table>
    </div>
  );
}
