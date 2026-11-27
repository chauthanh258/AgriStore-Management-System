import apiClient from "../../lib/axios/client";
import type { PaginatedResponse, Unit, UnitRequest } from "../../types/api";
import { mockCreateUnit, mockDeleteUnit, mockUnits, mockUpdateUnit } from "../../lib/mock-api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export async function getUnits(search?: string) {
  const response = await apiClient.get<PaginatedResponse<Unit>>("/api/units", {
    params: { page: 1, pageSize: 100, search }
  });
  return response.data;
}

export async function getUnitById(id: string) {
  const response = await apiClient.get<Unit>(`/api/units/${id}`);
  return response.data;
}

export async function createUnit(request: UnitRequest) {
  const response = await apiClient.post<Unit>("/api/units", request);
  return response.data;
}

export async function updateUnit(id: string, request: UnitRequest) {
  const response = await apiClient.put<Unit>(`/api/units/${id}`, request);
  return response.data;
}

export async function deleteUnit(id: string) {
  await apiClient.delete(`/api/units/${id}`);
}

export const unitRepository = {
  getUnits: (search?: string) => useMock ? mockUnits() : getUnits(search),
  createUnit: (request: UnitRequest) => useMock ? mockCreateUnit(request) : createUnit(request),
  updateUnit: (id: string, request: UnitRequest) => useMock ? mockUpdateUnit(id, request) : updateUnit(id, request),
  deleteUnit: (id: string) => useMock ? mockDeleteUnit(id) : deleteUnit(id)
};
