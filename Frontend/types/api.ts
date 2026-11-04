export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface RoleRequest {
  name: string;
  description?: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export interface AddressBookItem extends Address {
  customerId: string;
  customerName: string;
}

export type AddressBookResponse = PaginatedResponse<AddressBookItem>;

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  message: string;
  resetToken?: string | null;
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
  symbol?: string | null;
  abbreviation?: string | null;
  isActive: boolean;
}

export interface UnitRequest {
  name: string;
  symbol: string;
  description?: string;
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

export interface AddressRequest {
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

export interface PosOrderRequest {
  customerId?: string | null;
  warehouseId?: string | null;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface OrderListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface UpdateOrderStatusRequest {
  status: string;
}

export interface UpdateOrderRequest {
  customerId?: string | null;
  shippingAddressId?: string | null;
  shippingMethodId?: string | null;
  warehouseId?: string | null;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface InventoryItem {
  productId: string;
  productCode: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockAlert: number;
  isLowStock: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  phone: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
  isActive: boolean;
  notes?: string | null;
}

export interface SupplierRequest {
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
}

export interface StockTransactionLine {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  countedQuantity?: number | null;
}

export interface StockTransaction {
  id: string;
  batchId: string;
  warehouseId: string;
  warehouseName: string;
  transactionType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  lines: StockTransactionLine[];
}

export interface StockTransactionRequest {
  warehouseId: string;
  transactionType: "Import" | "Export" | "Count" | "Adjust";
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  lines: Array<{
    productId: string;
    quantity?: number;
    adjustment?: number;
    countedQuantity?: number;
  }>;
}

export interface RevenueReport {
  groupBy: string;
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  paidOrderCount: number;
  periods: Array<{ period: string; revenue: number; paidOrderCount: number }>;
}

export interface TopSellingProduct {
  productId: string;
  productCode: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface UpdateUserRolesRequest {
  roles: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  userCount: number;
  isSystemRole: boolean;
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
  isActive?: boolean;
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
