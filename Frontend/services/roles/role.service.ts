import apiClient from "../../lib/axios/client";
import type { Role, RoleRequest } from "../../types/api";

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
