import axios from "axios";
import type { ProblemDetails } from "../../types/api";

export function getAuthError(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ProblemDetails>(error)) return fallback;
  const data = error.response?.data;
  if (data?.errors) {
    const messages = Object.values(data.errors).flat();
    if (messages.length) return messages.join(" ");
  }
  return data?.detail ?? data?.title ?? fallback;
}
