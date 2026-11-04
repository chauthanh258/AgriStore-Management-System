"use client";
import { useState } from "react";
import {
  ResourcePage,
  StatusBadge
} from "../../../components/admin/resource-page";
import { AdminModal } from "../../../components/admin/admin-ui";
import { vouchers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
export default function VouchersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saved, setSaved] = useState("");
  return (
    <>
      {saved && <div className="mb-4 rounded-lg bg-[#effaf2] px-4 py-3 text-xs text-[#065f46]">{saved}</div>}
      <ResourcePage
      eyebrow="KHUYẾN MÃI & MARKETING　›　VOUCHER"
      title="Quản Lý Mã Giảm Giá & Chương Trình Khuyến Mãi"
      description="Mock repository sẵn sàng kết nối API coupon khi backend bổ sung contract."
      action={
        <button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
          <button onClick={() => { setSaved(""); setModalOpen(true); }} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">
            ＋ Tạo Khuyến Mãi Mới (F1)
          </button>
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
      {modalOpen && (
        <AdminModal
          title="Tạo chương trình khuyến mãi"
          description="Mỗi đơn chỉ áp dụng một mã giảm giá và một mã freeship."
          onClose={() => setModalOpen(false)}
          footer={<><button className="rounded-lg border px-4 py-2 text-xs" onClick={() => setModalOpen(false)}>Hủy</button><button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white" onClick={() => { setModalOpen(false); setSaved("Đã lưu bản nháp chương trình khuyến mãi."); }}>Lưu bản nháp</button></>}
        >
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <label>Mã voucher<input className="mt-1 w-full rounded-lg border p-3" placeholder="VD: MUAXANH10" /></label>
            <label>Tên chương trình<input className="mt-1 w-full rounded-lg border p-3" placeholder="Tên hiển thị" /></label>
            <label>Loại giảm<select className="mt-1 w-full rounded-lg border p-3"><option>Phần trăm</option><option>Số tiền</option><option>Freeship</option></select></label>
            <label>Giá trị giảm<input type="number" min={0} className="mt-1 w-full rounded-lg border p-3" /></label>
            <label>Đơn tối thiểu<input type="number" min={0} className="mt-1 w-full rounded-lg border p-3" /></label>
            <label>Giới hạn lượt dùng<input type="number" min={1} className="mt-1 w-full rounded-lg border p-3" /></label>
            <div className="rounded-lg bg-[#f2f7ef] p-3 sm:col-span-2">Guardrail: không cho cộng dồn hai voucher giảm giá và phải hoàn lượt dùng khi hủy đơn.</div>
          </div>
        </AdminModal>
      )}
    </>
  );
}
