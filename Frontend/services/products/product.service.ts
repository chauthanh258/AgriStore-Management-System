import apiClient from "../../lib/axios/client";
import type { PaginatedResponse, Product, ProductQuery } from "../../types/api";

export async function getProducts(params: ProductQuery = {}) {
  const response = await apiClient.get<PaginatedResponse<Product>>("/api/products", {
    params: { page: 1, pageSize: 20, ...params },
  });
  return response.data;
}

export async function getProductById(id: string) {
  const response = await apiClient.get<Product>(`/api/products/${id}`);
  return response.data;
}
