"use client";

import { useMemo, useState } from "react";
import { products } from "../../../data/mock";
import { customers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import { IconButton, PageHeader, StatusBadge } from "../../../components/admin/admin-ui";

export default function PosPage() {
  const [cart, setCart] = useState<Record<string, number>>({
    [products[0].id]: 2,
    [products[1].id]: 1
  });
  const [search, setSearch] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "card">("cash");

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.code}`.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );
  const customerResults = useMemo(
    () =>
      customerQuery.trim()
        ? customers.filter((customer) => customer.phone.includes(customerQuery.trim()))
        : [],
    [customerQuery]
  );
  const total = Object.entries(cart).reduce(
    (sum, [id, quantity]) =>
      sum + (products.find((item) => item.id === id)?.sellingPrice ?? 0) * quantity,
    0
  );
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  function add(id: string) {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    setMessage("");
  }
  function changeQuantity(id: string, delta: number) {
    setCart((current) => {
      const quantity = (current[id] ?? 0) + delta;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: quantity };
    });
  }
  function pay() {
    if (!Object.keys(cart).length) {
      setMessage("Đơn hàng chưa có sản phẩm.");
      return;
    }
    setMessage(`Đã ghi nhận thanh toán ${paymentMethod === "cash" ? "tiền mặt" : paymentMethod === "qr" ? "VietQR" : "thẻ"}${selectedCustomer ? ` cho ${selectedCustomer.fullName}` : " cho khách vãng lai"}.`);
  }

  return (
    <>
      <PageHeader
        eyebrow="BÁN HÀNG › POINT OF SALE"
        title="Bán hàng tại quầy (POS)"
        description="Tìm sản phẩm nhanh, tra cứu khách bằng số điện thoại và thanh toán an toàn."
        action={<button onClick={() => { setCart({}); setCustomerId(null); setMessage(""); }} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">⌘ F2 Đơn mới</button>}
      />
      {message && <div className="mb-4 rounded-lg border border-[#b7dfc7] bg-[#effaf2] px-4 py-3 text-xs text-[#065f46]">{message}</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-4 flex gap-2 rounded-xl border border-[#dfe8dd] bg-white p-3">
            <input autoFocus className="min-w-0 flex-1 rounded-lg border p-3 text-xs" placeholder="Tìm sản phẩm hoặc SKU..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <button className="rounded-lg bg-[#f2f7ef] px-4 text-xs" type="button">⚖ Cân điện tử</button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {visibleProducts.map((product) => (
              <button onClick={() => add(product.id)} className="rounded-xl border border-[#dfe8dd] bg-white p-3 text-left hover:border-[#006948]" key={product.id}>
                <div className="h-24 rounded bg-cover bg-center" style={{ backgroundImage: `url(${product.mainImageUrl})` }} />
                <small className="mt-2 block text-[10px] text-[#66736a]">Còn {product.minStockAlert + 12} · {product.code}</small>
                <b className="mt-1 block truncate text-xs">{product.name}</b>
                <span className="text-sm font-bold text-[#006948]">{formatCurrency(product.sellingPrice)}</span>
              </button>
            ))}
          </div>
        </section>
        <aside className="h-fit rounded-xl border border-[#dfe8dd] bg-white p-4 xl:sticky xl:top-16">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Đơn đang thu</h2><StatusBadge>{Object.keys(cart).length} sản phẩm</StatusBadge></div>
          <div className="relative mb-3">
            <input className="w-full rounded-lg border p-3 text-xs" placeholder="Tìm khách bằng số điện thoại..." value={customerQuery} onChange={(event) => { setCustomerQuery(event.target.value); setCustomerId(null); }} />
            {customerResults.length > 0 && <div className="absolute left-0 right-0 top-full z-10 rounded-lg border bg-white p-1 shadow-lg">{customerResults.map((customer) => <button key={customer.id} className="block w-full rounded p-2 text-left text-xs hover:bg-[#f2f7ef]" onClick={() => { setCustomerId(customer.id); setCustomerQuery(customer.phone); }}>{customer.fullName} · {customer.phone}</button>)}</div>}
          </div>
          <div className="mb-4 flex items-center justify-between rounded-lg bg-[#f2f7ef] p-3 text-xs">
            <span>{selectedCustomer ? `${selectedCustomer.fullName} · ${selectedCustomer.memberTier}` : "Khách vãng lai"}</span>
            {selectedCustomer && <IconButton label="Bỏ chọn khách" onClick={() => { setCustomerId(null); setCustomerQuery(""); }}>×</IconButton>}
          </div>
          <div className="space-y-2">
            {Object.entries(cart).map(([id, quantity]) => {
              const product = products.find((item) => item.id === id);
              return product ? <div className="flex items-center justify-between rounded-lg border border-[#e7eee4] p-3 text-xs" key={id}><span className="min-w-0"><b className="block truncate">{product.name}</b><small className="text-[#66736a]">{formatCurrency(product.sellingPrice)} · {product.unitName}</small></span><span className="ml-2 flex items-center gap-2"><IconButton label="Giảm số lượng" onClick={() => changeQuantity(id, -1)}>−</IconButton><b>{quantity}</b><IconButton label="Tăng số lượng" onClick={() => changeQuantity(id, 1)}>＋</IconButton></span></div> : null;
            })}
          </div>
          <input className="my-4 w-full rounded-lg border p-3 text-xs" placeholder="Mã voucher..." />
          <div className="space-y-3 border-t pt-4 text-xs"><div className="flex justify-between"><span>Tạm tính</span><b>{formatCurrency(total)}</b></div><div className="flex justify-between"><span>Ưu đãi</span><b className="text-[#006948]">-30.000 đ</b></div><div className="flex justify-between text-lg"><b>Khách phải trả</b><b className="text-[#006948]">{formatCurrency(Math.max(0, total - 30000))}</b></div></div>
          <div className="mt-4 grid grid-cols-3 gap-2">{[["cash", "Tiền mặt"], ["qr", "VietQR"], ["card", "Thẻ"]].map(([value, label]) => <button key={value} onClick={() => setPaymentMethod(value as typeof paymentMethod)} className={`rounded-lg p-3 text-[10px] ${paymentMethod === value ? "bg-[#006948] text-white" : "bg-[#f2f7ef]"}`}>{label}</button>)}</div>
          <button onClick={pay} className="mt-3 w-full rounded-xl bg-[#006948] py-4 font-bold text-white">▣ THANH TOÁN & IN (F12)</button>
        </aside>
      </div>
    </>
  );
}
