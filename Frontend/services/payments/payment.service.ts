import apiClient from "../../lib/axios/client";

export interface Payment {
  id: string;
  orderId: string;
  paymentMethod: "Cash" | "BankTransfer" | "CashOnDelivery" | string;
  amount: number;
  status: "Pending" | "Paid" | "Failed" | "Refunded" | string;
  transactionCode?: string | null;
  paidAt?: string | null;
  notes?: string | null;
}

export async function getPayment(orderId: string) {
  const response = await apiClient.get<Payment>(`/api/orders/${orderId}/payment`);
  return response.data;
}

export async function createPayment(orderId: string, request: { paymentMethod: string; transactionCode?: string; notes?: string }) {
  const response = await apiClient.post<Payment>(`/api/orders/${orderId}/payment`, request);
  return response.data;
}

export async function updatePaymentStatus(orderId: string, request: { status: string; notes?: string }) {
  const response = await apiClient.patch<Payment>(`/api/orders/${orderId}/payment/status`, request);
  return response.data;
}
