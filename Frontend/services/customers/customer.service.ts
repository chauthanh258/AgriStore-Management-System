import apiClient from "../../lib/axios/client";
import type {
  Address,
  AddressBookResponse,
  AddressRequest,
  Customer,
  PaginatedResponse
} from "../../types/api";

export async function getCustomers(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const response = await apiClient.get<PaginatedResponse<Customer>>("/api/customers", { params });
  return response.data;
}

export type CustomerRequest = Pick<Customer, "fullName" | "phone" | "email" | "gender" | "dateOfBirth" | "notes">;

export async function createCustomer(request: CustomerRequest) {
  const response = await apiClient.post<Customer>("/api/customers", request);
  return response.data;
}

export async function getCustomerById(id: string) {
  const response = await apiClient.get<Customer>(`/api/customers/${id}`);
  return response.data;
}

export async function updateCustomer(id: string, request: CustomerRequest) {
  const response = await apiClient.put<Customer>(`/api/customers/${id}`, request);
  return response.data;
}

export async function deleteCustomer(id: string) {
  await apiClient.delete(`/api/customers/${id}`);
}

export async function getAddresses(customerId: string) {
  const response = await apiClient.get<Address[]>(`/api/customers/${customerId}/addresses`);
  return response.data;
}

export async function getCustomerAddressBook(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const response = await apiClient.get<AddressBookResponse>("/api/customers/addresses", { params });
  return response.data;
}

export async function getAccountAddresses() {
  const response = await apiClient.get<Address[]>("/api/account/addresses");
  return response.data;
}

export async function createAccountAddress(request: AddressRequest) {
  const response = await apiClient.post<Address>("/api/account/addresses", request);
  return response.data;
}

export async function updateAccountAddress(addressId: string, request: AddressRequest) {
  const response = await apiClient.put<Address>(
    `/api/account/addresses/${addressId}`,
    request
  );
  return response.data;
}

export async function setAccountDefaultAddress(addressId: string) {
  await apiClient.patch(`/api/account/addresses/${addressId}/default`);
}

export async function createAddress(customerId: string, request: AddressRequest) {
  const response = await apiClient.post<Address>(
    `/api/customers/${customerId}/addresses`,
    request
  );
  return response.data;
}

export async function setDefaultAddress(customerId: string, addressId: string) {
  await apiClient.patch(`/api/customers/${customerId}/addresses/${addressId}/default`);
}

export async function updateAddress(customerId: string, addressId: string, request: AddressRequest) {
  const response = await apiClient.put<Address>(
    `/api/customers/${customerId}/addresses/${addressId}`,
    request
  );
  return response.data;
}

export async function deleteAddress(customerId: string, addressId: string) {
  await apiClient.delete(`/api/customers/${customerId}/addresses/${addressId}`);
}
