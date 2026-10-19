import { categories, customer, orders, products } from "../data/mock";
import type { CreateOnlineOrderRequest, Order, PaginatedResponse, Product, ProductQuery } from "../types/api";

export async function mockProducts(params: ProductQuery = {}): Promise<PaginatedResponse<Product>> {
  await new Promise((resolve) => setTimeout(resolve, 180));
  let result = products.filter((product) => product.isActive);
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
  return product;
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
