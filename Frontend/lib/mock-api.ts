import { categories, customer, orders, products } from "../data/mock";
import type { Category, CategoryRequest, CreateOnlineOrderRequest, Order, PaginatedResponse, Product, ProductImage, ProductQuery, ProductRequest } from "../types/api";

export async function mockProducts(params: ProductQuery = {}): Promise<PaginatedResponse<Product>> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  let result = [...products];
  if (params.search) result = result.filter((product) => product.name.toLowerCase().includes(params.search!.toLowerCase()));
  if (params.categoryId) result = result.filter((product) => product.categoryId === params.categoryId);
  if (params.unitId) result = result.filter((product) => product.unitId === params.unitId);
  if (params.minPrice !== undefined) result = result.filter((product) => product.sellingPrice >= params.minPrice!);
  if (params.maxPrice !== undefined) result = result.filter((product) => product.sellingPrice <= params.maxPrice!);
  if (params.isFeatured !== undefined) result = result.filter((product) => product.isFeatured === params.isFeatured);
  if (params.sortBy) result.sort((a, b) => String(a[params.sortBy!]).localeCompare(String(b[params.sortBy!])));
  if (params.sortDirection === "desc") result.reverse();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  return { items: result.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalCount: result.length, totalPages: Math.ceil(result.length / pageSize) };
}

export async function mockProduct(id: string) {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error("Không tìm thấy sản phẩm.");
  return { ...product, images: product.images ?? (product.mainImageUrl ? [{ id: `${id}-image`, imageUrl: product.mainImageUrl, isMain: true, sortOrder: 0 }] : []) };
}

export async function mockCreateProduct(request: ProductRequest) {
  const product: Product = {
    ...request,
    id: `prod-${Date.now()}`,
    categoryName: categories.find((item) => item.id === request.categoryId)?.name ?? "",
    unitName: request.unitId,
    description: request.description ?? null,
    shortDescription: request.shortDescription ?? null,
    expiryDays: request.expiryDays ?? 0,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    mainImageUrl: ""
  };
  products.unshift(product);
  return product;
}

export async function mockUpdateProduct(id: string, request: ProductRequest) {
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) throw new Error("Không tìm thấy sản phẩm.");
  products[index] = {
    ...products[index],
    ...request,
    categoryName: categories.find((item) => item.id === request.categoryId)?.name ?? "",
    unitName: request.unitId,
    description: request.description ?? null,
    shortDescription: request.shortDescription ?? null,
    expiryDays: request.expiryDays ?? 0,
    updatedAt: new Date().toISOString()
  };
  return products[index];
}

export async function mockDeleteProduct(id: string) {
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) throw new Error("Không tìm thấy sản phẩm.");
  products.splice(index, 1);
}

export async function mockCategories(params: { search?: string; isActive?: boolean } = {}): Promise<PaginatedResponse<Category>> {
  let result = [...categories];
  if (params.search) result = result.filter((item) => item.name.toLowerCase().includes(params.search!.toLowerCase()));
  if (params.isActive !== undefined) result = result.filter((item) => item.isActive === params.isActive);
  return { items: result, page: 1, pageSize: 100, totalCount: result.length, totalPages: 1 };
}

export async function mockCreateCategory(request: CategoryRequest) {
  const category: Category = { ...request, id: `cat-${Date.now()}`, description: request.description ?? null, parentId: request.parentId ?? null, image: request.image ?? null };
  categories.push(category);
  return category;
}

export async function mockUpdateCategory(id: string, request: CategoryRequest) {
  const index = categories.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Không tìm thấy danh mục.");
  categories[index] = { ...categories[index], ...request, description: request.description ?? null, parentId: request.parentId ?? null, image: request.image ?? null };
  return categories[index];
}

export async function mockSetCategoryStatus(id: string, isActive: boolean) {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error("Không tìm thấy danh mục.");
  category.isActive = isActive;
  return category;
}

export async function mockDeleteCategory(id: string) {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error("Không tìm thấy danh mục.");
  if (products.some((item) => item.categoryId === id)) throw new Error("Không thể xóa danh mục đang có sản phẩm.");
  categories.splice(categories.indexOf(category), 1);
}

export async function mockUploadProductImage(id: string, file: File) {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error("Không tìm thấy sản phẩm.");
  const image: ProductImage = { id: `${id}-image-${Date.now()}`, imageUrl: URL.createObjectURL(file), isMain: !product.images?.length, sortOrder: product.images?.length ?? 0 };
  product.images = [...(product.images ?? []), image];
  if (image.isMain) product.mainImageUrl = image.imageUrl;
  return image;
}

export async function mockSetProductMainImage(id: string, imageId: string) {
  const product = products.find((item) => item.id === id);
  const image = product?.images?.find((item) => item.id === imageId);
  if (!product || !image) throw new Error("Không tìm thấy ảnh sản phẩm.");
  product.images = product.images!.map((item) => ({ ...item, isMain: item.id === imageId }));
  product.mainImageUrl = image.imageUrl;
  return image;
}

export async function mockDeleteProductImage(id: string, imageId: string) {
  const product = products.find((item) => item.id === id);
  if (!product?.images?.some((item) => item.id === imageId)) throw new Error("Không tìm thấy ảnh sản phẩm.");
  const remaining = product.images.filter((item) => item.id !== imageId);
  if (product.images.find((item) => item.id === imageId)?.isMain && remaining.length) remaining[0].isMain = true;
  product.images = remaining;
  product.mainImageUrl = remaining.find((item) => item.isMain)?.imageUrl ?? "";
}

export async function mockOrder(request: CreateOnlineOrderRequest): Promise<Order> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const details = request.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)!;
    return { productId: product.id, productCode: product.code, productName: product.name, quantity: item.quantity, unitPrice: product.sellingPrice, discount: 0, totalPrice: product.sellingPrice * item.quantity };
  });
  const order: Order = { id: `order-${Date.now()}`, code: `AGR-2026-${String(orders.length + 9882)}`, warehouseId: request.warehouseId, customerId: request.customerId, userId: null, orderDate: new Date().toISOString(), status: "Đang xử lý", shippingAddressId: request.shippingAddressId, shippingMethodId: request.shippingMethodId, subTotal: details.reduce((sum, item) => sum + item.totalPrice, 0), discountAmount: 0, shippingFee: 0, totalAmount: details.reduce((sum, item) => sum + item.totalPrice, 0), note: request.note ?? null, couponId: null, details };
  orders.unshift(order);
  return order;
}

export { categories, customer, orders };
