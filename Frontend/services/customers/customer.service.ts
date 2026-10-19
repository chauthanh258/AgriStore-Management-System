import apiClient from "../../lib/axios/client";
import type { Address, Customer } from "../../types/api";

export async function getCustomerById(id: string) {
  const response = await apiClient.get<Customer>(`/api/customers/${id}`);
  return response.data;
}

export async function getAddresses(customerId: string) {
  const response = await apiClient.get<Address[]>(`/api/customers/${customerId}/addresses`);
  return response.data;
}
