import type { Order, PaginatedResponse, Product, ProductReview } from "./api";

export type AdminRole = "Admin" | "Manager" | "Staff";

export interface AdminSession {
  userId: string;
  fullName: string;
  email: string;
  roles: AdminRole[];
  warehouseName: string;
}

export interface RevenueReport {
  groupBy: "day" | "month";
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  paidOrderCount: number;
  periods: Array<{ period: string; revenue: number; paidOrderCount: number }>;
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

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string | null;
  address: string;
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  details: Array<{ productId: string; productName: string; quantity: number; receivedQuantity: number; unitPrice: number }>;
}

export interface Voucher {
  id: string;
  code: string;
  name: string;
  discountType: "Percent" | "Amount";
  discountValue: number;
  minOrderValue: number;
  usageCount: number;
  usageLimit: number;
  status: "Active" | "Scheduled" | "Expired";
  startsAt: string;
  endsAt: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  roles: AdminRole[];
  warehouseName: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AdminCustomer {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  loyaltyPoints: number;
  memberTier: "Standard" | "Silver" | "Gold" | "Diamond";
  totalSpent: number;
  orderCount: number;
  isActive: boolean;
}

export interface AdminReview extends ProductReview {
  productName: string;
  productCode: string;
  productImageUrl: string;
  customerTier: AdminCustomer["memberTier"];
  isFlagged: boolean;
  hasImages: boolean;
  createdAt: string;
  orderCode: string;
  reply: string | null;
}

export interface AdminApiLists {
  products: PaginatedResponse<Product>;
  orders: PaginatedResponse<Order>;
  inventory: PaginatedResponse<InventoryItem>;
  purchaseOrders: PaginatedResponse<PurchaseOrder>;
  customers: PaginatedResponse<AdminCustomer>;
  users: PaginatedResponse<AdminUser>;
  reviews: PaginatedResponse<AdminReview>;
}
