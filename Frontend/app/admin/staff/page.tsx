"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AdminModal,
  DataTable,
  IconButton,
  PageHeader,
  StatusBadge
} from "../../../components/admin/admin-ui";
import { users as mockUsers } from "../../../data/admin-mock";
import { useAuth } from "../../../providers/auth-provider";
import {
  getUserById,
  getUserRoles,
  getUsers,
  setUserStatus,
  updateUser,
  updateUserRoles
} from "../../../services/users/user.service";
import {
  getPermissions,
  getRolePermissions,
  getRoles,
  updateRolePermissions
} from "../../../services/roles/role.service";
import type {
  Permission,
  Role,
  UpdateRolePermissionsRequest,
  UpdateUserRequest,
  UpdateUserRolesRequest,
  UserResponse
} from "../../../types/api";
import type { AdminUser } from "../../../types/admin";
import { Plus, Edit, Trash2, UserCheck, UserX, UserCog } from "lucide-react";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const SYSTEM_ROLES = ["Admin", "Manager", "Staff", "Customer"] as const;
const MOCK_PERMISSIONS: Permission[] = [
  { code: "users.read", name: "Xem người dùng", description: null, module: "users", action: "read" },
  { code: "users.manage", name: "Quản lý người dùng", description: null, module: "users", action: "manage" },
  { code: "users.assign_roles", name: "Gán vai trò", description: null, module: "users", action: "assign_roles" },
  { code: "roles.manage", name: "Quản lý vai trò", description: null, module: "roles", action: "manage" },
  { code: "roles.assign_permissions", name: "Gán permission cho vai trò", description: null, module: "roles", action: "assign_permissions" },
  { code: "products.view", name: "Xem sản phẩm", description: null, module: "products", action: "view" },
  { code: "products.manage", name: "Quản lý sản phẩm", description: null, module: "products", action: "manage" },
  { code: "catalog.manage", name: "Quản lý danh mục", description: null, module: "catalog", action: "manage" },
  { code: "operations.manage", name: "Quản lý vận hành", description: null, module: "operations", action: "manage" },
  { code: "customers.manage", name: "Quản lý khách hàng", description: null, module: "customers", action: "manage" },
  { code: "reports.view", name: "Xem báo cáo", description: null, module: "reports", action: "view" }
];
const MOCK_ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: [],
  Manager: [
    "users.read", "users.manage", "products.view", "products.manage",
    "catalog.manage", "operations.manage", "customers.manage", "reports.view"
  ],
  Staff: ["operations.manage", "reports.view"],
  Customer: ["products.view"]
};
const MODULE_LABELS: Record<string, string> = {
  users: "Người dùng",
  roles: "Vai trò",
  products: "Sản phẩm",
  catalog: "Danh mục & đơn vị",
  operations: "Vận hành",
  customers: "Khách hàng",
  reports: "Báo cáo"
};

interface UserFormData extends UpdateUserRequest {
  isActive: boolean;
}

const emptyUserForm: UserFormData = {
  fullName: "",
  email: "",
  phoneNumber: "",
  avatar: "",
  roles: [],
  isActive: true
};

function errorMessage(error: unknown) {
  const response = (error as { response?: { data?: { detail?: string } } }).response;
  return (
    response?.data?.detail ??
    (error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.")
  );
}

// Convert AdminUser (mock) to UserResponse (API) format
function toUserResponse(user: AdminUser | UserResponse): UserResponse {
  if ("userName" in user) {
    return user; // Already UserResponse
  }
  // Convert AdminUser to UserResponse
  return {
    id: user.id,
    userName: user.email, // Use email as username for mock
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    avatar: null,
    isActive: user.isActive,
    createdAt: new Date().toISOString(), // Mock creation date
    updatedAt: null,
    roles: user.roles
  };
}

export default function StaffPage() {
  const { hasPermission, permissionError } = useAuth();
  const canViewUsers = useMock || hasPermission("users.read") || hasPermission("users.manage");
  const canManageUsers = useMock || hasPermission("users.manage");
  const canAssignRoles = useMock || hasPermission("users.assign_roles");
  const canManageRolePermissions = useMock || hasPermission("roles.assign_permissions");
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [apiUsers, setApiUsers] = useState<UserResponse[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // User CRUD modals
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>(emptyUserForm);
  const [submitting, setSubmitting] = useState(false);

  // Role assignment modal
  const [roleModal, setRoleModal] = useState(false);
  const [roleUser, setRoleUser] = useState<UserResponse | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [permissionRoles, setPermissionRoles] = useState<Role[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<Permission[]>([]);
  const [permissionRoleId, setPermissionRoleId] = useState("");
  const [rolePermissionCodes, setRolePermissionCodes] = useState<string[]>([]);
  const [permissionPanelLoading, setPermissionPanelLoading] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [permissionLoadFailed, setPermissionLoadFailed] = useState(false);
  const permissionRequestSequence = useRef(0);

  // Combine API users with mock users (converted to UserResponse)
  const mockUsersConverted = mockUsers.map(toUserResponse);
  const currentUsers = apiUsers ?? (useMock ? mockUsersConverted : []);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const result = await getUsers({ page: 1, pageSize: 100 });
      setApiUsers(result.items);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialUsers() {
      if (!canViewUsers) {
        return;
      }
      try {
        const result = await getUsers({ page: 1, pageSize: 100 });
        if (active) setApiUsers(result.items);
      } catch (loadError) {
        if (active) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialUsers();
    return () => {
      active = false;
    };
  }, [canViewUsers]);

  useEffect(() => {
    if (tab !== "roles") return;
    let active = true;
    const requestSequence = ++permissionRequestSequence.current;

    async function loadPermissionPanel() {
      setPermissionPanelLoading(true);
      setPermissionLoadFailed(false);
      setRolePermissionCodes([]);
      setError("");
      try {
        if (useMock) {
          const mockRoles: Role[] = SYSTEM_ROLES.map((name) => ({
            id: name,
            name,
            description: null,
            createdAt: "",
            userCount: 0,
            isSystemRole: true
          }));
          if (!active) return;
          setPermissionRoles(mockRoles);
          setPermissionCatalog(MOCK_PERMISSIONS);
          setPermissionRoleId("Manager");
          setRolePermissionCodes(MOCK_ROLE_PERMISSIONS.Manager);
          return;
        }

        const [roles, permissions] = await Promise.all([getRoles(), getPermissions()]);
        if (!active || requestSequence !== permissionRequestSequence.current) return;
        setPermissionRoles(roles);
        setPermissionCatalog(permissions);
        const firstEditableRole = roles.find((role) => role.name !== "Admin") ?? roles[0];
        setPermissionRoleId(firstEditableRole?.id ?? "");
        if (firstEditableRole) {
          const rolePermissions = await getRolePermissions(firstEditableRole.id);
          if (!active || requestSequence !== permissionRequestSequence.current) return;
          setRolePermissionCodes(rolePermissions.permissionCodes);
        } else {
          setRolePermissionCodes([]);
        }
      } catch (loadError) {
        if (active && requestSequence === permissionRequestSequence.current) {
          setError(errorMessage(loadError));
          setPermissionLoadFailed(true);
        }
      } finally {
        if (active && requestSequence === permissionRequestSequence.current) {
          setPermissionPanelLoading(false);
        }
      }
    }

    void loadPermissionPanel();
    return () => {
      active = false;
    };
  }, [tab]);

  // --- User CRUD Operations ---

  function openCreateUser() {
    setEditingUser(null);
    setUserForm({ ...emptyUserForm, isActive: true });
    setError("");
    setUserModal(true);
  }

  async function openEditUser(user: UserResponse) {
    try {
      const detail = useMock ? user : await getUserById(user.id);
      setEditingUser(detail);
      setUserForm({
        fullName: detail.fullName,
        email: detail.email ?? "",
        phoneNumber: detail.phoneNumber ?? "",
        avatar: detail.avatar ?? "",
        roles: detail.roles,
        isActive: detail.isActive
      });
      setError("");
      setUserModal(true);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userForm.fullName.trim() || !userForm.email.trim()) {
      setError("Họ tên và Email là bắt buộc.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editingUser) {
        const { isActive, roles, ...userFields } = userForm;
        const updateData: UpdateUserRequest = canAssignRoles
          ? { ...userFields, roles }
          : userFields;
        await updateUser(editingUser.id, updateData);
        // Handle status separately if needed
        if (isActive !== editingUser.isActive) {
          await setUserStatus(editingUser.id, isActive);
        }
      } else {
        // Note: Create user typically uses Register endpoint
        // For now we'll just update mock data if in mock mode
        if (useMock) {
          const newUser: UserResponse = {
            id: `user-${Date.now()}`,
            userName: userForm.email,
            email: userForm.email,
            fullName: userForm.fullName,
            phoneNumber: userForm.phoneNumber || null,
            avatar: userForm.avatar || null,
            isActive: userForm.isActive,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            roles: userForm.roles ?? []
          };
          setApiUsers((prev) => (prev ? [newUser, ...prev] : [newUser]));
        } else {
          setError("Tạo tài khoản mới cần sử dụng API đăng ký (Register). Chỉ hỗ trợ sửa thông tin.");
          return;
        }
      }
      setUserModal(false);
      await loadUsers();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUserStatus(user: UserResponse) {
    try {
      await setUserStatus(user.id, !user.isActive);
      await loadUsers();
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  }

  async function deleteUser(user: UserResponse) {
    if (!window.confirm(`Xóa nhân viên "${user.fullName}"?`)) return;
    try {
      // Soft delete via deactivation
      await setUserStatus(user.id, false);
      await loadUsers();
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  }

  // --- Role Management Operations ---

  async function openRoleModal(user: UserResponse) {
    try {
      const rolesData = useMock ? { userId: user.id, roles: user.roles } : await getUserRoles(user.id);
      setRoleUser(user);
      setUserRoles(rolesData.roles);
      setError("");
      setRoleModal(true);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  async function saveUserRoles() {
    if (!roleUser) return;
    try {
      const request: UpdateUserRolesRequest = { roles: userRoles };
      if (useMock) {
        // Update mock data
        setApiUsers((prev) => prev?.map((u) => (u.id === roleUser.id ? { ...u, roles: userRoles } : u)) ?? []);
      } else {
        await updateUserRoles(roleUser.id, request);
      }
      setRoleModal(false);
      await loadUsers();
    } catch (submitError) {
      setError(errorMessage(submitError));
    }
  }

  function toggleUserRole(role: string) {
    setUserRoles((current) =>
      current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
    );
  }

  async function selectPermissionRole(roleId: string) {
    const requestSequence = ++permissionRequestSequence.current;
    setPermissionRoleId(roleId);
    if (useMock) {
      const roleName = permissionRoles.find((role) => role.id === roleId)?.name ?? "";
      setRolePermissionCodes(MOCK_ROLE_PERMISSIONS[roleName] ?? []);
      setPermissionLoadFailed(false);
      return;
    }

    setRolePermissionCodes([]);
    setPermissionLoadFailed(false);
    setPermissionPanelLoading(true);
    try {
      const rolePermissions = await getRolePermissions(roleId);
      if (requestSequence === permissionRequestSequence.current) {
        setRolePermissionCodes(rolePermissions.permissionCodes);
      }
    } catch (loadError) {
      if (requestSequence === permissionRequestSequence.current) {
        setError(errorMessage(loadError));
        setPermissionLoadFailed(true);
      }
    } finally {
      if (requestSequence === permissionRequestSequence.current) {
        setPermissionPanelLoading(false);
      }
    }
  }

  function togglePermission(code: string) {
    setRolePermissionCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    );
  }

  async function saveRolePermissions() {
    const role = permissionRoles.find((item) => item.id === permissionRoleId);
    if (!role || role.name === "Admin") return;

    setPermissionSaving(true);
    setError("");
    try {
      if (!useMock) {
        const request: UpdateRolePermissionsRequest = { permissionCodes: rolePermissionCodes };
        const saved = await updateRolePermissions(role.id, request);
        setRolePermissionCodes(saved.permissionCodes);
      } else {
        MOCK_ROLE_PERMISSIONS[role.name] = rolePermissionCodes;
      }
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setPermissionSaving(false);
    }
  }

  // --- Render ---

  return (
    <>
      {(error || permissionError) && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{error || permissionError}</div>
      )}
      <PageHeader
        eyebrow="HỆ THỐNG & BẢO MẬT › NHÂN VIÊN & PHÂN QUYỀN (RBAC)"
        title="Quản Lý Nhân Viên & Phân Quyền Hệ Thống"
        description="Quản lý danh sách tài khoản, vai trò, quyền truy cập và audit log."
        action={
          tab === "users" && canManageUsers && (
            <button
              onClick={openCreateUser}
              className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Thêm Nhân Viên Mới (F1)
            </button>
          )
        }
      />
      <div className="mb-4 flex gap-2 border-b border-[#dfe8dd]">
        <button
          onClick={() => setTab("users")}
          className={
            `px-4 py-3 text-xs font-bold ${tab === "users" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`
          }
        >
          Danh sách nhân viên
        </button>
        {canManageRolePermissions && <button
          onClick={() => setTab("roles")}
          className={
            `px-4 py-3 text-xs font-bold ${tab === "roles" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`
          }
        >
          Phân quyền
        </button>}
      </div>

      {tab === "users" ? !canViewUsers ? (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-8 text-center text-sm text-[#66736a]">
          Tài khoản hiện tại không có permission xem danh sách người dùng.
        </div>
      ) : (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          <DataTable headers={["Mã NV & Họ tên", "Tài khoản & Liên hệ", "Vai trò phân quyền", "Trạng thái", "Thao tác"]}>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-center" colSpan={5}>
                  Đang tải...
                </td>
              </tr>
            ) : (
              currentUsers.map((user) => (
                <tr className="hover:bg-[#f8fbf7]" key={user.id}>
                  <td className="px-3 py-3">
                    <b>{user.fullName}</b>
                    <small className="block text-[10px] text-[#66736a]">{user.id}</small>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[#006948]">{user.email ?? "—"}</span>
                    <small className="block text-[10px] text-[#66736a]">{user.phoneNumber ?? "—"}</small>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <StatusBadge key={role} tone="blue">{role}</StatusBadge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={user.isActive ? "green" : "gray"}>
                      {user.isActive ? "Đang hoạt động" : "Đã khóa"}
                    </StatusBadge>
                  </td>
                  <td className="space-x-2 px-3 py-3">
                    {canManageUsers && (
                      <>
                        <IconButton label={`Sửa ${user.fullName}`} onClick={() => openEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={user.isActive ? `Khóa ${user.fullName}` : `Mở khóa ${user.fullName}`}
                          onClick={() => toggleUserStatus(user)}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </IconButton>
                        <IconButton
                          label={`Xóa ${user.fullName}`}
                          tone="danger"
                          onClick={() => deleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </>
                    )}
                    {canAssignRoles && (
                      <IconButton label={`Phân vai trò ${user.fullName}`} onClick={() => openRoleModal(user)}>
                        <UserCog className="h-4 w-4" />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))
            )}
          </DataTable>
          {!loading && currentUsers.length === 0 && (
            <div className="mt-4 text-center text-[#66736a] text-sm">Chưa có nhân viên nào.</div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <label className="min-w-60 text-xs font-semibold text-[#33443a]">
              Vai trò cần cấu hình
              <select
                className="mt-2 block w-full rounded-lg border border-[#dfe8dd] bg-white p-3"
                value={permissionRoleId}
                onChange={(event) => void selectPermissionRole(event.target.value)}
                disabled={permissionPanelLoading || permissionSaving || permissionRoles.length === 0}
              >
                {permissionRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={saveRolePermissions}
              disabled={permissionSaving || permissionPanelLoading || permissionLoadFailed || !permissionRoleId || permissionRoles.find((role) => role.id === permissionRoleId)?.name === "Admin"}
              className="rounded-lg bg-[#006948] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
            >
              {permissionSaving ? "Đang lưu..." : "Lưu permission"}
            </button>
          </div>
          {permissionPanelLoading ? (
            <p className="py-8 text-center text-sm text-[#66736a]">Đang tải danh mục quyền...</p>
          ) : permissionRoles.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#66736a]">Chưa có role để cấu hình.</p>
          ) : permissionRoles.find((role) => role.id === permissionRoleId)?.name === "Admin" ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
              Admin luôn có toàn quyền; không cần gán permission riêng.
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-[#66736a]">
                Permission được cấp cho mọi người dùng đang thuộc role này. Backend vẫn kiểm tra quyền trên từng API.
              </p>
              {[...new Set(permissionCatalog.map((permission) => permission.module))].map((module) => (
                <section key={module} className="rounded-lg border border-[#e7eee5]">
                  <h3 className="border-b border-[#e7eee5] bg-[#f8fbf7] px-4 py-3 text-sm font-bold text-[#33443a]">
                    {MODULE_LABELS[module] ?? module}
                  </h3>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    {permissionCatalog
                      .filter((permission) => permission.module === module)
                      .map((permission) => (
                        <label key={permission.code} className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={rolePermissionCodes.includes(permission.code)}
                            onChange={() => togglePermission(permission.code)}
                            disabled={permissionPanelLoading || permissionSaving || permissionLoadFailed}
                            className="mt-0.5 h-4 w-4 rounded border-[#dfe8dd] text-[#006948] focus:ring-[#9bd2b9]"
                          />
                          <span>
                            <span className="block text-xs font-semibold text-[#33443a]">{permission.name}</span>
                            <span className="mt-1 block text-[10px] text-[#66736a]">
                              {permission.description ?? permission.code}
                            </span>
                          </span>
                        </label>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit User Modal */}
      {userModal && (
        <AdminModal
          title={editingUser ? "Sửa nhân viên" : "Thêm nhân viên mới"}
          description="Thông tin tài khoản và phân quyền cơ bản."
          onClose={() => setUserModal(false)}
          footer={
            <>
              <button type="button" className="rounded-lg border px-4 py-2 text-xs" onClick={() => setUserModal(false)}>
                Hủy
              </button>
              <button
                type="submit"
                form="user-form"
                disabled={submitting}
                className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : editingUser ? "Cập nhật nhân viên" : "Tạo nhân viên"}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={submitUser} className="grid gap-4 sm:grid-cols-2 text-xs">
            <label className="text-xs">
              Họ tên <span className="text-red-500">*</span>
              <input
                required
                className="mt-1 w-full rounded-lg border p-3"
                value={userForm.fullName}
                onChange={(event) => setUserForm({ ...userForm, fullName: event.target.value })}
                placeholder="Nguyễn Văn An"
              />
            </label>
            <label className="text-xs">
              Email <span className="text-red-500">*</span>
              <input
                required
                type="email"
                className="mt-1 w-full rounded-lg border p-3"
                value={userForm.email}
                onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                placeholder="an.nguyen@agristore.vn"
              />
            </label>
            <label className="text-xs">
              Số điện thoại
              <input
                className="mt-1 w-full rounded-lg border p-3"
                value={userForm.phoneNumber ?? ""}
                onChange={(event) => setUserForm({ ...userForm, phoneNumber: event.target.value })}
                placeholder="0901 234 567"
              />
            </label>
            <label className="text-xs">
              Avatar URL
              <input
                className="mt-1 w-full rounded-lg border p-3"
                value={userForm.avatar ?? ""}
                onChange={(event) => setUserForm({ ...userForm, avatar: event.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </label>
            {canAssignRoles && <label className="text-xs sm:col-span-2">
              Vai trò
              <select
                multiple
                className="mt-1 w-full rounded-lg border p-3"
                value={userForm.roles ?? []}
                onChange={(event) => {
                  const selected = Array.from(event.target.selectedOptions, (option) => option.value);
                  setUserForm({ ...userForm, roles: selected });
                }}
              >
                {SYSTEM_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <small className="block text-[10px] text-[#66736a] mt-1">Giữ Ctrl/Cmd để chọn nhiều</small>
            </label>}
            <label className="text-xs sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={userForm.isActive ?? true}
                onChange={(event) => setUserForm({ ...userForm, isActive: event.target.checked })}
                className="h-4 w-4 rounded border-[#dfe8dd] text-[#006948] focus:ring-[#9bd2b9]"
              />
              <span>Đang hoạt động</span>
            </label>
            {error && (
              <div className="col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
          </form>
        </AdminModal>
      )}

      {/* Role Assignment Modal */}
      {roleModal && roleUser && (
        <AdminModal
          title={`Phân quyền: ${roleUser.fullName}`}
          description="Chọn các vai trò cho nhân viên này."
          onClose={() => setRoleModal(false)}
          footer={
            <>
              <button type="button" className="rounded-lg border px-4 py-2 text-xs" onClick={() => setRoleModal(false)}>
                Hủy
              </button>
              <button
                type="button"
                onClick={saveUserRoles}
                className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white"
              >
                Lưu phân quyền
              </button>
            </>
          }
        >
          <div className="space-y-3">
            {SYSTEM_ROLES.map((role) => (
              <label key={role} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userRoles.includes(role)}
                  onChange={() => toggleUserRole(role)}
                  className="h-4 w-4 rounded border-[#dfe8dd] text-[#006948] focus:ring-[#9bd2b9]"
                />
                <span className="text-sm font-medium">{role}</span>
                <span className="text-[10px] text-[#66736a] ml-auto">
                  {role === "Admin" && "Quyền truy cập toàn hệ thống"}
                  {role === "Manager" && "Quản lý kho, đơn hàng, nhân viên"}
                  {role === "Staff" && "Xử lý đơn hàng, POS, nhập xuất kho"}
                  {role === "Customer" && "Khách hàng mua hàng online"}
                </span>
              </label>
            ))}
          </div>
        </AdminModal>
      )}
    </>
  );
}