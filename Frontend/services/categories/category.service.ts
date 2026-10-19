import apiClient from "../../lib/axios/client";
import type { Category, PaginatedResponse } from "../../types/api";

export async function getCategories() {
  const response = await apiClient.get<PaginatedResponse<Category>>("/api/categories", {
    params: { page: 1, pageSize: 20, isActive: true },
  });
  return response.data;
}
