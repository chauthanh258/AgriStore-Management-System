import apiClient from "../../lib/axios/client";
import type { PaginatedResponse, UpdateUserRequest, UpdateUserRolesRequest, UserListQuery, UserResponse } from "../../types/api";

export async function getUsers(params: UserListQuery = {}) {
  const response = await apiClient.get<PaginatedResponse<UserResponse>>("/api/users", { params });
  return response.data;
}

export async function getUserById(id: string) {
  const response = await apiClient.get<UserResponse>(`/api/users/${id}`);
  return response.data;
}

export async function updateUser(id: string, request: UpdateUserRequest) {
  const response = await apiClient.put<UserResponse>(`/api/users/${id}`, request);
  return response.data;
}

export async function setUserStatus(id: string, isActive: boolean) {
  const response = await apiClient.patch<UserResponse>(`/api/users/${id}/status`, { isActive });
  return response.data;
}

export async function getUserRoles(id: string) {
  const response = await apiClient.get<{ userId: string; roles: string[] }>(`/api/users/${id}/roles`);
  return response.data;
}

export async function updateUserRoles(id: string, request: UpdateUserRolesRequest) {
  const response = await apiClient.put<{ userId: string; roles: string[] }>(`/api/users/${id}/roles`, request);
  return response.data;
}

export async function addUserRole(id: string, roleName: string) {
  const response = await apiClient.post<{ userId: string; roles: string[] }>(
    `/api/users/${id}/roles/${encodeURIComponent(roleName)}`
  );
  return response.data;
}

export async function removeUserRole(id: string, roleName: string) {
  const response = await apiClient.delete<{ userId: string; roles: string[] }>(
    `/api/users/${id}/roles/${encodeURIComponent(roleName)}`
  );
  return response.data;
}
