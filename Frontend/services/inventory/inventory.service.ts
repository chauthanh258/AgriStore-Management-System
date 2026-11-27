import apiClient from "../../lib/axios/client";
import type {
  InventoryItem,
  PaginatedResponse,
  StockTransaction,
  StockTransactionRequest
} from "../../types/api";

export async function getInventories(params: { productId?: string; warehouseId?: string; page?: number; pageSize?: number } = {}) {
  const response = await apiClient.get<PaginatedResponse<InventoryItem>>("/api/inventories", { params });
  return response.data;
}

export async function getLowStock(params: { warehouseId?: string; page?: number; pageSize?: number } = {}) {
  const response = await apiClient.get<PaginatedResponse<InventoryItem>>("/api/inventories/low-stock", { params });
  return response.data;
}

export async function getStockTransactions(params: Record<string, string | number | undefined> = {}) {
  const response = await apiClient.get<PaginatedResponse<StockTransaction>>("/api/stock-transactions", { params });
  return response.data;
}

export async function createStockTransaction(request: StockTransactionRequest) {
  const response = await apiClient.post<StockTransaction>("/api/stock-transactions", request);
  return response.data;
}
