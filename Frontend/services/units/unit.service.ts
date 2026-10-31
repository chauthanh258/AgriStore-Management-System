import apiClient from "../../lib/axios/client";
import type { PaginatedResponse, Unit } from "../../types/api";

export async function getUnits() {
  const response = await apiClient.get<PaginatedResponse<Unit>>("/api/units", {
    params: { page: 1, pageSize: 100, isActive: true }
  });
  return response.data;
}
