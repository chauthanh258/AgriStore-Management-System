import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../providers/auth-provider";

export const metadata: Metadata = {
  title: "AgriStore - Nông sản tươi sạch",
  description: "Nông sản VietGAP giao tận bếp trong 2 giờ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
