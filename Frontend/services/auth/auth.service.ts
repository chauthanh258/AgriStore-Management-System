import apiClient from "../../lib/axios/client";
import type { AuthResponse } from "../../types/api";

export async function login(email: string, password: string) {
  const response = await apiClient.post<AuthResponse>("/api/auth/login", { email, password });
  if (typeof window !== "undefined") {
    window.localStorage.setItem("agristore_access_token", response.data.accessToken);
  }
  return response.data;
}

export async function logout() {
  await apiClient.post("/api/auth/logout");
  if (typeof window !== "undefined") window.localStorage.removeItem("agristore_access_token");
}
