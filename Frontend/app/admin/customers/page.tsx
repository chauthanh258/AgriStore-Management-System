"use client";
import {
  ResourcePage,
  StatusBadge
} from "../../../components/admin/resource-page";
import { customers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
export default function CustomersPage() {
  return (
    <ResourcePage
      eyebrow="KHÁCH HÀNG & MARKETING　›　QUẢN TRỊ KHÁCH HÀNG & HỘI VIÊN"
      title="Quản Trị Khách Hàng & Chương Trình Hội Viên"
      description="Theo dõi hồ sơ, lịch sử mua sắm, tích lũy điểm thưởng và hành vi tiêu dùng."
      headers={[
        "Khách hàng & mã",
        "Hạng hội viên",
        "Điểm AgriClub",
        "Chi tiêu",
        "Trạng thái"
      ]}
      rows={customers.map((customer) => ({
        id: customer.id,
        search: `${customer.fullName} ${customer.phone}`,
        status: customer.isActive ? "Active" : "Inactive"
      }))}
      columns={[
        (row) => (
          <span>
            <b>{customers.find((item) => item.id === row.id)?.fullName}</b>
            <small className="block text-[10px] text-[#66736a]">
              {customers.find((item) => item.id === row.id)?.phone}
            </small>
          </span>
        ),
        (row) => (
          <StatusBadge tone="blue">
            {customers.find((item) => item.id === row.id)?.memberTier}
          </StatusBadge>
        ),
        (row) =>
          customers
            .find((item) => item.id === row.id)
            ?.loyaltyPoints.toLocaleString("vi-VN"),
        (row) =>
          formatCurrency(
            customers.find((item) => item.id === row.id)?.totalSpent ?? 0
          ),
        () => <StatusBadge>Đang hoạt động</StatusBadge>
      ]}
    />
  );
}
