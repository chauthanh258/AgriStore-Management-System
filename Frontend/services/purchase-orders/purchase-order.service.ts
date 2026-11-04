import apiClient from "../../lib/axios/client";
import type {
  PurchaseOrder,
  PurchaseOrderLineRequest,
  PurchaseOrderRequest,
  ReceivePurchaseOrderRequest
} from "../../types/purchase-orders";

export async function getPurchaseOrder(id: string) {
  const response = await apiClient.get<PurchaseOrder>(`/api/purchase-orders/${id}`);
  return response.data;
}

export async function createPurchaseOrder(request: PurchaseOrderRequest) {
  const response = await apiClient.post<PurchaseOrder>("/api/purchase-orders", request);
  return response.data;
}

export async function updatePurchaseOrder(id: string, request: PurchaseOrderRequest) {
  const response = await apiClient.put<PurchaseOrder>(`/api/purchase-orders/${id}`, request);
  return response.data;
}

export async function addPurchaseOrderDetail(id: string, request: PurchaseOrderLineRequest) {
  const response = await apiClient.post<PurchaseOrder>(`/api/purchase-orders/${id}/details`, request);
  return response.data;
}

export async function removePurchaseOrderDetail(id: string, detailId: string) {
  const response = await apiClient.delete<PurchaseOrder>(`/api/purchase-orders/${id}/details/${detailId}`);
  return response.data;
}

export async function orderPurchaseOrder(id: string) {
  const response = await apiClient.post<PurchaseOrder>(`/api/purchase-orders/${id}/order`);
  return response.data;
}

export async function receivePurchaseOrder(id: string, request: ReceivePurchaseOrderRequest) {
  const response = await apiClient.post<PurchaseOrder>(`/api/purchase-orders/${id}/receive`, request);
  return response.data;
}
