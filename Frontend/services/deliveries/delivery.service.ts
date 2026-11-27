import apiClient from "../../lib/axios/client";

export interface Delivery {
  id: string;
  orderId: string;
  trackingCode?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  status: string;
  scheduledAt?: string | null;
  deliveredAt?: string | null;
}

export async function getDelivery(orderId: string) {
  const response = await apiClient.get<Delivery>(`/api/orders/${orderId}/delivery`);
  return response.data;
}

export async function createDelivery(orderId: string, request: Record<string, unknown>) {
  const response = await apiClient.post<Delivery>(`/api/orders/${orderId}/delivery`, request);
  return response.data;
}

export async function updateDeliveryStatus(orderId: string, status: string) {
  const response = await apiClient.patch<Delivery>(`/api/orders/${orderId}/delivery/status`, { status });
  return response.data;
}
