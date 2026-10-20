import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5274",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("agristore_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (error.response?.status !== 401 || !config || config._retry || config.url?.includes("/api/auth/refresh")) {
      return Promise.reject(error);
    }
    config._retry = true;
    try {
      const refresh = await apiClient.post<{ accessToken: string }>("/api/auth/refresh");
      if (typeof window !== "undefined") window.localStorage.setItem("agristore_access_token", refresh.data.accessToken);
      return apiClient(config);
    } catch (refreshError) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("agristore_access_token");
        window.location.pathname = "/dang-nhap";
      }
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
