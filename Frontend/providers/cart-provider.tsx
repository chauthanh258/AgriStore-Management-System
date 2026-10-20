"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Product } from "../types/api";

type Cart = Record<string, number>;
type CartContextValue = {
  cart: Cart;
  count: number;
  add: (product: Product, quantity?: number) => void;
  update: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "agristore_cart";

function readCart(): Cart {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Cart;
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(readCart);
  const updateState = (next: Cart) => {
    setCart(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const value = useMemo<CartContextValue>(() => ({
    cart,
    count: Object.values(cart).reduce((total, quantity) => total + quantity, 0),
    add: (product, quantity = 1) => updateState({ ...cart, [product.id]: (cart[product.id] ?? 0) + quantity }),
    update: (productId, quantity) => updateState({ ...cart, [productId]: Math.max(1, quantity) }),
    remove: (productId) => {
      const next = { ...cart };
      delete next[productId];
      updateState(next);
    },
    clear: () => updateState({}),
  }), [cart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
