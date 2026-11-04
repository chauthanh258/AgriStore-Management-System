import apiClient from "../../lib/axios/client";
import type {
  Order,
  OrderListQuery,
  PaginatedResponse,
  PosOrderRequest,
  UpdateOrderRequest,
  UpdateOrderStatusRequest
} from "../../types/api";

export async function getAdminOrders(params: OrderListQuery = {}) {
  const response = await apiClient.get<PaginatedResponse<Order>>("/api/orders", { params });
  return response.data;
}

export async function getAdminOrder(id: string) {
  const response = await apiClient.get<Order>(`/api/orders/${id}`);
  return response.data;
}

export async function createPosOrder(request: PosOrderRequest) {
  const response = await apiClient.post<Order>("/api/orders/pos", request);
  return response.data;
}

export async function updateOrderStatus(id: string, request: UpdateOrderStatusRequest) {
  const response = await apiClient.patch<Order>(`/api/orders/${id}/status`, request);
  return response.data;
}

export async function updateOrder(id: string, request: UpdateOrderRequest) {
  const response = await apiClient.put<Order>(`/api/orders/${id}`, request);
  return response.data;
}

export async function applyOrderCoupon(id: string, code: string) {
  const response = await apiClient.post<Order>(`/api/orders/${id}/coupon`, { code });
  return response.data;
}
