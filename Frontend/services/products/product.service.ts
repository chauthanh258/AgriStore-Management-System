import apiClient from "../../lib/axios/client";
import type {
  PaginatedResponse,
  Product,
  ProductQuery,
  ProductRequest
} from "../../types/api";

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

export async function createProduct(request: ProductRequest) {
  const response = await apiClient.post<Product>("/api/products", request);
  return response.data;
}

export async function updateProduct(id: string, request: ProductRequest) {
  const response = await apiClient.put<Product>(`/api/products/${id}`, request);
  return response.data;
}

export async function deleteProduct(id: string) {
  await apiClient.delete(`/api/products/${id}`);
}

export async function uploadProductImage(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post(`/api/products/${id}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
}

export async function setProductMainImage(id: string, imageId: string) {
  const response = await apiClient.patch(`/api/products/${id}/images/${imageId}/main`);
  return response.data;
}

export async function deleteProductImage(id: string, imageId: string) {
  await apiClient.delete(`/api/products/${id}/images/${imageId}`);
}
