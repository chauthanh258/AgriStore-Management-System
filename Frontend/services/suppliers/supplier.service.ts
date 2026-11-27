import apiClient from "../../lib/axios/client";
import type { PaginatedResponse, Supplier, SupplierRequest } from "../../types/api";

export async function getSuppliers(params: { page?: number; pageSize?: number; search?: string; isActive?: boolean } = {}) {
  const response = await apiClient.get<PaginatedResponse<Supplier>>("/api/suppliers", { params });
  return response.data;
}

export async function getSupplier(id: string) {
  const response = await apiClient.get<Supplier>(`/api/suppliers/${id}`);
  return response.data;
}

export async function createSupplier(request: SupplierRequest) {
  const response = await apiClient.post<Supplier>("/api/suppliers", request);
  return response.data;
}

export async function updateSupplier(id: string, request: SupplierRequest) {
  const response = await apiClient.put<Supplier>(`/api/suppliers/${id}`, request);
  return response.data;
}

export async function setSupplierStatus(id: string, isActive: boolean) {
  const response = await apiClient.patch<Supplier>(`/api/suppliers/${id}/status`, { isActive });
  return response.data;
}

export async function deleteSupplier(id: string) {
  await apiClient.delete(`/api/suppliers/${id}`);
}
