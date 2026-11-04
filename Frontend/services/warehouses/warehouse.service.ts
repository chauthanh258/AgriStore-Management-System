import apiClient from "../../lib/axios/client";
import type { Warehouse } from "../../types/api";

export type WarehouseRequest = Omit<Warehouse, "id">;

export async function getWarehouses() {
  const response = await apiClient.get<Warehouse[]>("/api/warehouses");
  return response.data;
}

export async function getWarehouseById(id: string) {
  const response = await apiClient.get<Warehouse>(`/api/warehouses/${id}`);
  return response.data;
}

export async function createWarehouse(request: WarehouseRequest) {
  const response = await apiClient.post<Warehouse>("/api/warehouses", request);
  return response.data;
}

export async function updateWarehouse(id: string, request: WarehouseRequest) {
  const response = await apiClient.put<Warehouse>(`/api/warehouses/${id}`, request);
  return response.data;
}

export async function deleteWarehouse(id: string) {
  await apiClient.delete(`/api/warehouses/${id}`);
}
