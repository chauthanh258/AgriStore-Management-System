"use client";
import {
  ResourcePage,
  StatusBadge
} from "../../../components/admin/resource-page";
import { vouchers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
export default function VouchersPage() {
  return (
    <ResourcePage
      eyebrow="KHUYẾN MÃI & MARKETING　›　VOUCHER"
      title="Quản Lý Mã Giảm Giá & Chương Trình Khuyến Mãi"
      description="Mock repository sẵn sàng kết nối API coupon khi backend bổ sung contract."
      action={
        <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
          ＋ Tạo Khuyến Mãi Mới (F1)
        </button>
      }
      headers={[
        "Mã & tên chương trình",
        "Mức giảm",
        "Điều kiện áp dụng",
        "Lượt sử dụng",
        "Trạng thái"
      ]}
      rows={vouchers.map((voucher) => ({
        id: voucher.id,
        search: `${voucher.code} ${voucher.name}`,
        status: voucher.status
      }))}
      columns={[
        (row) => (
          <span>
            <b className="text-[#006948]">
              {vouchers.find((item) => item.id === row.id)?.code}
            </b>
            <small className="block text-[10px] text-[#66736a]">
              {vouchers.find((item) => item.id === row.id)?.name}
            </small>
          </span>
        ),
        (row) => {
          const voucher = vouchers.find((item) => item.id === row.id)!;
          return voucher.discountType === "Percent"
            ? `Giảm ${voucher.discountValue}%`
            : formatCurrency(voucher.discountValue);
        },
        (row) =>
          `≥ ${formatCurrency(vouchers.find((item) => item.id === row.id)?.minOrderValue ?? 0)}`,
        (row) =>
          `${vouchers.find((item) => item.id === row.id)?.usageCount} / ${vouchers.find((item) => item.id === row.id)?.usageLimit}`,
        (row) => (
          <StatusBadge tone={row.status === "Active" ? "green" : "amber"}>
            {row.status}
          </StatusBadge>
        )
      ]}
    />
  );
}
