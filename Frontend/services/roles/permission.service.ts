import apiClient from "../../lib/axios/client";

export async function getCurrentPermissions() {
  const response = await apiClient.get<string[]>("/api/permissions/me");
  return response.data;
}
