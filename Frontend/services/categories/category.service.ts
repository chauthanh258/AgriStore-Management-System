import apiClient from "../../lib/axios/client";
import type { Category, CategoryRequest, PaginatedResponse } from "../../types/api";

export async function getCategories(params: { search?: string; isActive?: boolean } = {}) {
  const response = await apiClient.get<PaginatedResponse<Category>>("/api/categories", {
    params: { page: 1, pageSize: 100, ...params },
  });
  return response.data;
}

export async function createCategory(request: CategoryRequest) {
  const response = await apiClient.post<Category>("/api/categories", request);
  return response.data;
}

export async function updateCategory(id: string, request: CategoryRequest) {
  const response = await apiClient.put<Category>(`/api/categories/${id}`, request);
  return response.data;
}

export async function setCategoryStatus(id: string, isActive: boolean) {
  const response = await apiClient.patch<Category>(`/api/categories/${id}/status`, { isActive });
  return response.data;
}

export async function deleteCategory(id: string) {
  await apiClient.delete(`/api/categories/${id}`);
}
