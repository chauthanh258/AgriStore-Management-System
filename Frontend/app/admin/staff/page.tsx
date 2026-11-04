"use client";

import { useEffect, useState } from "react";
import { ResourcePage, StatusBadge } from "../../../components/admin/resource-page";
import { users } from "../../../data/admin-mock";
import { getUsers } from "../../../services/users/user.service";
import type { UserResponse } from "../../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export default function StaffPage() {
  const [apiUsers, setApiUsers] = useState<UserResponse[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (useMock) return;
    getUsers({ page: 1, pageSize: 100 })
      .then((result) => setApiUsers(result.items))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không thể tải nhân viên."));
  }, []);

  const currentUsers = apiUsers ?? users;
  return (
    <>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      <ResourcePage
        eyebrow="HỆ THỐNG & BẢO MẬT › NHÂN VIÊN & PHÂN QUYỀN (RBAC)"
        title="Quản Lý Nhân Viên & Phân Quyền Hệ Thống"
        description="Quản lý danh sách tài khoản, vai trò, quyền truy cập và audit log."
        action={<button className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">＋ Thêm Nhân Viên Mới (F1)</button>}
        headers={["Mã NV & họ tên", "Tài khoản & liên hệ", "Vai trò phân quyền", "Trạng thái"]}
        rows={currentUsers.map((user) => ({
          id: user.id,
          search: `${user.fullName} ${user.email ?? ""}`,
          status: user.isActive ? "Active" : "Inactive"
        }))}
        columns={[
          (row) => <b>{currentUsers.find((item) => item.id === row.id)?.fullName}</b>,
          (row) => {
            const user = currentUsers.find((item) => item.id === row.id);
            return <span className="text-[#006948]">{user?.email ?? "—"}<small className="block text-[10px] text-[#66736a]">{user?.phoneNumber ?? "—"}</small></span>;
          },
          (row) => <StatusBadge tone="blue">{currentUsers.find((item) => item.id === row.id)?.roles.join(", ")}</StatusBadge>,
          (row) => <StatusBadge tone={row.status === "Active" ? "green" : "gray"}>{row.status === "Active" ? "Đang hoạt động" : "Đã khóa"}</StatusBadge>
        ]}
      />
    </>
  );
}
