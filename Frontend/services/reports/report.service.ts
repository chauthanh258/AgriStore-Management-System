import apiClient from "../../lib/axios/client";
import type { InventoryItem, RevenueReport, TopSellingProduct } from "../../types/api";

export async function getRevenueReport(params: { fromDate?: string; toDate?: string; groupBy?: "day" | "month" } = {}) {
  const response = await apiClient.get<RevenueReport>("/api/reports/revenue", { params });
  return response.data;
}

export async function getTopSellingProducts(params: { fromDate?: string; toDate?: string; limit?: number } = {}) {
  const response = await apiClient.get<TopSellingProduct[]>("/api/reports/top-selling-products", { params });
  return response.data;
}

export async function getInventoryReport(params: { warehouseId?: string; lowStockOnly?: boolean } = {}) {
  const response = await apiClient.get<InventoryItem[]>("/api/reports/inventory", { params });
  return response.data;
}
