import { SiteFooter } from "../../components/(user)/layout/site-footer";
import { SiteHeader } from "../../components/(user)/layout/site-header";
import { CartProvider } from "../../providers/cart-provider";

export default function UserLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </CartProvider>
  );
}
