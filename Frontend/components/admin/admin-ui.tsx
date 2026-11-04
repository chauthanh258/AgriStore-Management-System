import type { ReactNode } from "react";
import { formatCurrency } from "../../lib/formatters";

export function IconButton({
  label,
  children,
  tone = "default",
  onClick,
  type = "button"
}: {
  label: string;
  children: ReactNode;
  tone?: "default" | "danger";
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      aria-label={label}
      title={label}
      type={type}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-xs transition focus:outline-none focus:ring-2 focus:ring-[#9bd2b9] ${
        tone === "danger"
          ? "border-red-100 text-red-600 hover:bg-red-50"
          : "border-[#dfe8dd] text-[#006948] hover:bg-[#eff7ed]"
      }`}
    >
      {children}
    </button>
  );
}

export function AdminModal({
  title,
  description,
  children,
  onClose,
  footer
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102219]/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#dfe8dd] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e7eee4] p-5">
          <div>
            <h2 id="admin-modal-title" className="text-lg font-bold">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-[#66736a]">{description}</p>
            )}
          </div>
          <IconButton label="Đóng cửa sổ" onClick={onClose}>
            ×
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-[#e7eee4] p-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

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
