import apiClient from "../../lib/axios/client";
import type { CreateProductReviewRequest, PaginatedResponse, ProductReview, SetProductReviewApprovalRequest } from "../../types/api";

export async function getProductReviews(productId: string, params: { page?: number; pageSize?: number; includePending?: boolean } = {}) {
  const response = await apiClient.get<PaginatedResponse<ProductReview>>(`/api/products/${productId}/reviews`, {
    params: { page: 1, pageSize: 20, ...params },
  });
  return response.data;
}

export async function createProductReview(productId: string, request: CreateProductReviewRequest) {
  const response = await apiClient.post<ProductReview>(`/api/products/${productId}/reviews`, request);
  return response.data;
}

export async function setProductReviewApproval(reviewId: string, request: SetProductReviewApprovalRequest) {
  const response = await apiClient.patch<ProductReview>(`/api/product-reviews/${reviewId}/approval`, request);
  return response.data;
}

export async function deleteProductReview(reviewId: string) {
  await apiClient.delete(`/api/product-reviews/${reviewId}`);
}
