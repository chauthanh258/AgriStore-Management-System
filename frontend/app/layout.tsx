import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriStore | Khách hàng",
  description: "Quản lý hồ sơ khách hàng và địa chỉ giao hàng.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
