import type { Address, Category, Customer, Order, Product } from "../types/api";

const images = [
  "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1582281298055-e25b84a30b0b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85",
];

export const categories: Category[] = [
  { id: "cat-rau", name: "Rau củ hữu cơ", description: "Rau tươi mỗi ngày", parentId: null, image: images[1], isActive: true, sortOrder: 1 },
  { id: "cat-trai", name: "Trái cây đặc sản", description: "Vị ngon theo mùa", parentId: null, image: images[0], isActive: true, sortOrder: 2 },
  { id: "cat-nam", name: "Nấm & Rau mầm", description: "Tươi non lành mạnh", parentId: null, image: images[2], isActive: true, sortOrder: 3 },
  { id: "cat-gao", name: "Gạo & Hạt", description: "Nguồn dinh dưỡng tự nhiên", parentId: null, image: images[5], isActive: true, sortOrder: 4 },
];

export const products: Product[] = [
  { id: "prod-dau", code: "AGR-FRU-089", name: "Dâu Tây Hana Mộc Châu", categoryId: "cat-trai", categoryName: "Trái cây đặc sản", unitId: "unit-hop", unitName: "Hộp 500g", description: "Dâu tây trồng trong nhà kính, thu hoạch theo ngày và vận chuyển lạnh.", shortDescription: "Dâu tươi mọng, vị ngọt thanh", costPrice: 90000, sellingPrice: 120000, minStockAlert: 10, expiryDays: 3, isActive: true, isFeatured: true, createdAt: "2026-10-17T08:00:00Z", updatedAt: null, mainImageUrl: images[0], images: [images[0], images[2], images[4]].map((imageUrl, index) => ({ id: `dau-image-${index}`, imageUrl, isMain: index === 0, sortOrder: index })) },
  { id: "prod-cai", code: "RAU-KALE-01", name: "Cải xoăn Kale Hữu cơ Đà Lạt", categoryId: "cat-rau", categoryName: "Rau củ hữu cơ", unitId: "unit-kg", unitName: "Kg", description: "Lá cải xanh giòn, giàu chất xơ, đạt chuẩn VietGAP.", shortDescription: "Đóng túi zipper thoáng khí", costPrice: 30000, sellingPrice: 42000, minStockAlert: 8, expiryDays: 4, isActive: true, isFeatured: true, createdAt: "2026-10-16T08:00:00Z", updatedAt: null, mainImageUrl: images[1] },
  { id: "prod-ca-rot", code: "CARROT-BB-02", name: "Cà Rốt Baby Đà Lạt", categoryId: "cat-rau", categoryName: "Rau củ hữu cơ", unitId: "unit-kg", unitName: "Kg", description: "Cà rốt baby ngọt tự nhiên, thu hoạch trong ngày.", shortDescription: "Giòn ngọt, giàu vitamin", costPrice: 28000, sellingPrice: 38000, minStockAlert: 8, expiryDays: 5, isActive: true, isFeatured: true, createdAt: "2026-10-15T08:00:00Z", updatedAt: null, mainImageUrl: images[3] },
  { id: "prod-bi", code: "BIO-HDL-05", name: "Bí Đỏ Hồ Lô Đà Lạt", categoryId: "cat-rau", categoryName: "Rau củ hữu cơ", unitId: "unit-kg", unitName: "Kg", description: "Bí đỏ hồ lô giàu beta-carotene, vị ngọt bùi.", shortDescription: "Quà tặng từ cao nguyên", costPrice: 20000, sellingPrice: 28000, minStockAlert: 10, expiryDays: 10, isActive: true, isFeatured: false, createdAt: "2026-10-14T08:00:00Z", updatedAt: null, mainImageUrl: images[4] },
  { id: "prod-khoai", code: "KHOAI-MAT-08", name: "Khoai Lang Mật Đà Lạt", categoryId: "cat-rau", categoryName: "Rau củ hữu cơ", unitId: "unit-kg", unitName: "Kg", description: "Khoai lang mật dẻo thơm, phù hợp nướng và hấp.", shortDescription: "Ngọt thơm tự nhiên", costPrice: 25000, sellingPrice: 32000, minStockAlert: 10, expiryDays: 14, isActive: true, isFeatured: true, createdAt: "2026-10-13T08:00:00Z", updatedAt: null, mainImageUrl: images[5] },
  { id: "prod-nam", code: "NAM-01", name: "Nấm đùi gà hữu cơ", categoryId: "cat-nam", categoryName: "Nấm & Rau mầm", unitId: "unit-hop", unitName: "Hộp 300g", description: "Nấm tươi đóng hộp giữ ẩm tự nhiên.", shortDescription: "Mềm thơm, giàu đạm thực vật", costPrice: 32000, sellingPrice: 48000, minStockAlert: 6, expiryDays: 5, isActive: true, isFeatured: true, createdAt: "2026-10-12T08:00:00Z", updatedAt: null, mainImageUrl: images[2] },
];

const address: Address = { id: "address-home", receiverName: "Nguyễn Thị Mai Anh", phone: "0988 123 456", province: "TP. Hồ Chí Minh", district: "Quận 3", ward: "Phường Võ Thị Sáu", detailAddress: "128 Nguyễn Đình Chiểu", isDefault: true };
export const customer: Customer = { id: "customer-demo", fullName: "Nguyễn Thị Mai Anh", phone: "0988 123 456", email: "nguyen.maianh@example.com", gender: "Nữ", dateOfBirth: "1994-05-15", loyaltyPoints: 1250, notes: "Ưu tiên rau củ tươi và trái cây theo mùa.", addresses: [address] };
export const orders: Order[] = [];
