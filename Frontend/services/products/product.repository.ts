import {
  mockCreateProduct,
  mockDeleteProduct,
  mockProduct,
  mockProducts,
  mockUpdateProduct
} from "../../lib/mock-api";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  uploadProductImage,
  setProductMainImage,
  deleteProductImage,
  updateProduct
} from "./product.service";
import { mockDeleteProductImage, mockSetProductMainImage, mockUploadProductImage } from "../../lib/mock-api";
import type { ProductQuery, ProductRequest } from "../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

export const productRepository = {
  getProducts: (params: ProductQuery = {}) => useMock ? mockProducts(params) : getProducts(params),
  getProductById: (id: string) => useMock ? mockProduct(id) : getProductById(id),
  createProduct: (request: ProductRequest) => useMock ? mockCreateProduct(request) : createProduct(request),
  updateProduct: (id: string, request: ProductRequest) => useMock ? mockUpdateProduct(id, request) : updateProduct(id, request),
  deleteProduct: (id: string) => useMock ? mockDeleteProduct(id) : deleteProduct(id),
  uploadProductImage: (id: string, file: File) => useMock ? mockUploadProductImage(id, file) : uploadProductImage(id, file),
  setProductMainImage: (id: string, imageId: string) => useMock ? mockSetProductMainImage(id, imageId) : setProductMainImage(id, imageId),
  deleteProductImage: (id: string, imageId: string) => useMock ? mockDeleteProductImage(id, imageId) : deleteProductImage(id, imageId),
};
