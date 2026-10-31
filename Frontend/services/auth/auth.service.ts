import apiClient from "../../lib/axios/client";
import type { AuthResponse, ChangePasswordRequest, RegisterRequest, RegisterResponse } from "../../types/api";

export async function login(email: string, password: string) {
  const response = await apiClient.post<AuthResponse>("/api/auth/login", { email, password });
  if (typeof window !== "undefined") {
    window.localStorage.setItem("agristore_access_token", response.data.accessToken);
    window.localStorage.setItem("agristore_auth_session", JSON.stringify(response.data));
  }
  return response.data;
}

export async function logout() {
  try {
    await apiClient.post("/api/auth/logout");
  } finally {
    if (typeof window !== "undefined") window.localStorage.removeItem("agristore_access_token");
    if (typeof window !== "undefined") window.localStorage.removeItem("agristore_auth_session");
  }
}

export async function register(request: RegisterRequest) {
  const response = await apiClient.post<RegisterResponse>("/api/auth/register", request);
  return response.data;
}

export async function refreshSession() {
  const response = await apiClient.post<AuthResponse>("/api/auth/refresh");
  if (typeof window !== "undefined") {
    window.localStorage.setItem("agristore_access_token", response.data.accessToken);
    window.localStorage.setItem("agristore_auth_session", JSON.stringify(response.data));
  }

  return response.data;
}

export async function changePassword(request: ChangePasswordRequest) {
  await apiClient.post("/api/auth/change-password", request);
}
