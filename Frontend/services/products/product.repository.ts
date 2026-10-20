import { mockProduct, mockProducts } from "../../lib/mock-api";
import { getProductById, getProducts } from "./product.service";
import type { ProductQuery } from "../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export const productRepository = {
  getProducts: (params: ProductQuery = {}) => useMock ? mockProducts(params) : getProducts(params),
  getProductById: (id: string) => useMock ? mockProduct(id) : getProductById(id),
};
