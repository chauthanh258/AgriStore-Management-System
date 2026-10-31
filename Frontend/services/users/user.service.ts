import apiClient from "../../lib/axios/client";
import type { UpdateUserRequest, UserResponse } from "../../types/api";

export async function getUserById(id: string) {
  const response = await apiClient.get<UserResponse>(`/api/users/${id}`);
  return response.data;
}

export async function updateUser(id: string, request: UpdateUserRequest) {
  const response = await apiClient.put<UserResponse>(`/api/users/${id}`, request);
  return response.data;
}
