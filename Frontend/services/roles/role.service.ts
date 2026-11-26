import apiClient from "../../lib/axios/client";
import type {
  Permission,
  Role,
  RolePermissions,
  RoleRequest,
  UpdateRolePermissionsRequest
} from "../../types/api";

export async function getRoles() {
  const response = await apiClient.get<Role[]>("/api/roles");
  return response.data;
}

export async function getRoleById(id: string) {
  const response = await apiClient.get<Role>(`/api/roles/${id}`);
  return response.data;
}

export async function createRole(request: RoleRequest) {
  const response = await apiClient.post<Role>("/api/roles", request);
  return response.data;
}

export async function updateRole(id: string, request: RoleRequest) {
  const response = await apiClient.put<Role>(`/api/roles/${id}`, request);
  return response.data;
}

export async function deleteRole(id: string) {
  await apiClient.delete(`/api/roles/${id}`);
}

export async function getPermissions() {
  const response = await apiClient.get<Permission[]>("/api/roles/permissions");
  return response.data;
}

export async function getRolePermissions(id: string) {
  const response = await apiClient.get<RolePermissions>(`/api/roles/${id}/permissions`);
  return response.data;
}

export async function updateRolePermissions(
  id: string,
  request: UpdateRolePermissionsRequest
) {
  const response = await apiClient.put<RolePermissions>(
    `/api/roles/${id}/permissions`,
    request
  );
  return response.data;
}
