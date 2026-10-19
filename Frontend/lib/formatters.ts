export const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} đ`;

export const fallbackImage =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85";
