"use client";
import { useEffect, useState } from "react";
import {
  ResourcePage,
  StatusBadge
} from "../../../components/admin/resource-page";
import { customers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import { getCustomers } from "../../../services/customers/customer.service";
import type { Customer } from "../../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
export default function CustomersPage() {
  const [apiCustomers, setApiCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (useMock) return;
    getCustomers({ page: 1, pageSize: 100 })
      .then((result) => setApiCustomers(result.items))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không thể tải khách hàng."));
  }, []);
  const currentCustomers = apiCustomers ?? customers;
  return (
    <>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
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
      rows={currentCustomers.map((customer) => ({
        id: customer.id,
        search: `${customer.fullName} ${customer.phone}`,
        status: "isActive" in customer && customer.isActive ? "Active" : "Active"
      }))}
      columns={[
        (row) => (
          <span>
            <b>{currentCustomers.find((item) => item.id === row.id)?.fullName}</b>
            <small className="block text-[10px] text-[#66736a]">
              {currentCustomers.find((item) => item.id === row.id)?.phone}
            </small>
          </span>
        ),
        (row) => (
          <StatusBadge tone="blue">
            {"memberTier" in (currentCustomers.find((item) => item.id === row.id) ?? {})
              ? (currentCustomers.find((item) => item.id === row.id) as typeof customers[number]).memberTier
              : "Khách hàng"}
          </StatusBadge>
        ),
        (row) =>
          currentCustomers
            .find((item) => item.id === row.id)
            ?.loyaltyPoints.toLocaleString("vi-VN"),
        (row) =>
          formatCurrency("totalSpent" in (currentCustomers.find((item) => item.id === row.id) ?? {}) ? (currentCustomers.find((item) => item.id === row.id) as typeof customers[number]).totalSpent : 0),
        () => <StatusBadge>Đang hoạt động</StatusBadge>
      ]}
      />
    </>
  );
}
