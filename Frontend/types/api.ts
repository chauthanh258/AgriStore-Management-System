export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isMain: boolean;
  sortOrder: number;
}

export interface CategoryRequest {
  name: string;
  description?: string;
  parentId?: string | null;
  image?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  description: string | null;
  shortDescription: string | null;
  costPrice: number;
  sellingPrice: number;
  minStockAlert: number;
  expiryDays: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string | null;
  mainImageUrl: string;
  images?: ProductImage[];
}

export interface Unit {
  id: string;
  name: string;
  abbreviation?: string | null;
  isActive: boolean;
}

export interface ProductRequest {
  code: string;
  name: string;
  categoryId: string;
  unitId: string;
  description?: string;
  shortDescription?: string;
  costPrice: number;
  sellingPrice: number;
  minStockAlert: number;
  expiryDays?: number;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
}

export interface CreateProductReviewRequest {
  rating: number;
  comment?: string;
}

export interface SetProductReviewApprovalRequest {
  isApproved: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Address {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  gender: string | null;
  dateOfBirth: string | null;
  loyaltyPoints: number;
  notes: string | null;
  addresses: Address[];
}

export interface OrderDetail {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  code: string;
  warehouseId: string;
  customerId: string;
  userId: string | null;
  orderDate: string;
  status: string;
  shippingAddressId: string;
  shippingMethodId: string;
  subTotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  note: string | null;
  couponId: string | null;
  details: OrderDetail[];
}

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  unitId?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  sortBy?: "name" | "code" | "sellingPrice" | "createdAt";
  sortDirection?: "asc" | "desc";
}

export interface CreateOnlineOrderRequest {
  customerId: string;
  shippingAddressId: string;
  shippingMethodId: string;
  warehouseId: string;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface UserResponse {
  id: string;
  userName: string | null;
  email: string | null;
  fullName: string;
  phoneNumber: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  roles: string[];
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  roles?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
