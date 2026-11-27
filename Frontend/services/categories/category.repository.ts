import {
  createCategory,
  deleteCategory,
  getCategories,
  setCategoryStatus,
  updateCategory
} from "./category.service";
import {
  mockCategories,
  mockCreateCategory,
  mockDeleteCategory,
  mockSetCategoryStatus,
  mockUpdateCategory
} from "../../lib/mock-api";
import type { CategoryRequest } from "../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export const categoryRepository = {
  getCategories: (params: { search?: string; isActive?: boolean } = {}) => useMock ? mockCategories(params) : getCategories(params),
  createCategory: (request: CategoryRequest) => useMock ? mockCreateCategory(request) : createCategory(request),
  updateCategory: (id: string, request: CategoryRequest) => useMock ? mockUpdateCategory(id, request) : updateCategory(id, request),
  setCategoryStatus: (id: string, isActive: boolean) => useMock ? mockSetCategoryStatus(id, isActive) : setCategoryStatus(id, isActive),
  deleteCategory: (id: string) => useMock ? mockDeleteCategory(id) : deleteCategory(id)
};
