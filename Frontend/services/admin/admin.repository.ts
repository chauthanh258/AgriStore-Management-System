import { listMocks, orders, products, reviews, vouchers } from "../../data/admin-mock";
import type { ProductQuery } from "../../types/api";
import type { Voucher } from "../../types/admin";

export const adminRepository = {
  getProducts: async (query: ProductQuery = {}) => ({ ...listMocks.products, items: products.filter((product) => !query.search || product.name.toLowerCase().includes(query.search.toLowerCase())) }),
  getOrders: async () => listMocks.orders,
  getInventory: async () => listMocks.inventory,
  getPurchaseOrders: async () => listMocks.purchaseOrders,
  getCustomers: async () => listMocks.customers,
  getUsers: async () => listMocks.users,
  getVouchers: async () => vouchers,
  getReviews: async () => listMocks.reviews,
  setReviewApproval: async (id: string, isApproved: boolean) => {
    const review = reviews.find((item) => item.id === id);
    if (!review) throw new Error("Không tìm thấy đánh giá.");
    review.isApproved = isApproved;
    return review;
  },
  createVoucher: async (voucher: Voucher) => { vouchers.unshift(voucher); return voucher; },
  updateOrderStatus: async (id: string, status: string) => { const order = orders.find((item) => item.id === id); if (!order) throw new Error("Không tìm thấy đơn hàng."); order.status = status; return order; },
};
