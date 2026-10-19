import axios from "axios";
import type { ProblemDetails } from "../../types/api";

export function getApiError(error: unknown): ProblemDetails {
  if (axios.isAxiosError<ProblemDetails>(error) && error.response?.data) {
    return error.response.data;
  }
  return {
    title: "Không thể kết nối máy chủ",
    detail: "Vui lòng thử lại sau ít phút.",
    status: 500,
  };
}

export function getApiErrorMessage(error: unknown): string {
  const problem = getApiError(error);
  return problem.detail ?? problem.title ?? "Đã xảy ra lỗi.";
}
