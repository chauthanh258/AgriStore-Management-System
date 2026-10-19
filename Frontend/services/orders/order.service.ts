import apiClient from "../../lib/axios/client";
import type { CreateOnlineOrderRequest, Order } from "../../types/api";

export async function createOnlineOrder(request: CreateOnlineOrderRequest) {
  const response = await apiClient.post<Order>("/api/orders/online", request);
  return response.data;
}
