"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton, PageHeader, StatusBadge } from "../../../components/admin/admin-ui";
import { customers as mockCustomers } from "../../../data/admin-mock";
import { products as mockProducts } from "../../../data/mock";
import { formatCurrency } from "../../../lib/formatters";
import { getCustomers } from "../../../services/customers/customer.service";
import { createPayment } from "../../../services/payments/payment.service";
import { getProducts } from "../../../services/products/product.service";
import { getInventories } from "../../../services/inventory/inventory.service";
import { getWarehouses } from "../../../services/warehouses/warehouse.service";
import {
  applyOrderCoupon,
  createPosOrder
} from "../../../services/orders/admin-order.service";
import type { Customer, Product } from "../../../types/api";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
type PosCustomer = Pick<Customer, "id" | "fullName" | "phone"> & { memberTier?: string };

export default function PosPage() {
  const [productList, setProductList] = useState<Product[]>(() => useMock ? mockProducts : []);
  const [customerList, setCustomerList] = useState<PosCustomer[]>(() =>
    useMock
      ? mockCustomers.map(({ id, fullName, phone, memberTier }) => ({ id, fullName, phone, memberTier }))
      : []
  );
  const [warehouseList, setWarehouseList] = useState<{ id: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [availableByProduct, setAvailableByProduct] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, number>>(() =>
    useMock ? { [mockProducts[0].id]: 2, [mockProducts[1].id]: 1 } : {}
  );
  const [search, setSearch] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "card">("cash");
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(!useMock);
  const [stockLoading, setStockLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inventoryRequest = useRef(0);

  const loadWarehouseStock = useCallback(async (nextWarehouseId: string) => {
    const requestId = ++inventoryRequest.current;
    setWarehouseId(nextWarehouseId);
    setStockLoading(true);
    setAvailableByProduct({});
    setLoadError("");
    try {
      const result = await getInventories({
        warehouseId: nextWarehouseId,
        page: 1,
        pageSize: 100
      });
      if (requestId === inventoryRequest.current) {
        setAvailableByProduct(
          Object.fromEntries(result.items.map((item) => [item.productId, item.availableQuantity]))
        );
      }
    } catch (error: unknown) {
      if (requestId === inventoryRequest.current) {
        setLoadError(error instanceof Error ? error.message : "Không thể tải tồn kho.");
      }
    } finally {
      if (requestId === inventoryRequest.current) setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (useMock) return;
    Promise.all([
      getProducts({ page: 1, pageSize: 100 }),
      getCustomers({ page: 1, pageSize: 100 }),
      getWarehouses()
    ])
      .then(async ([productResult, customerResult, warehouseResult]) => {
        setProductList(productResult.items);
        setCustomerList(customerResult.items.map(({ id, fullName, phone }) => ({ id, fullName, phone })));
        const activeWarehouses = warehouseResult.filter((warehouse) => warehouse.isActive);
        setWarehouseList(activeWarehouses);
        const defaultWarehouse = activeWarehouses.find((warehouse) => warehouse.isDefault);
        if (activeWarehouses.length) {
          await loadWarehouseStock((defaultWarehouse ?? activeWarehouses[0]).id);
        } else {
          setLoadError("Không có kho đang hoạt động để xuất hàng.");
        }
      })
      .catch((error: unknown) =>
        setLoadError(error instanceof Error ? error.message : "Không thể tải sản phẩm và khách hàng.")
      )
      .finally(() => setLoading(false));
  }, [loadWarehouseStock]);

  const visibleProducts = useMemo(
    () =>
      productList.filter((product) =>
        `${product.name} ${product.code}`.toLowerCase().includes(search.toLowerCase())
      ),
    [productList, search]
  );
  const customerResults = useMemo(
    () =>
      customerQuery.trim()
        ? customerList.filter((customer) =>
            `${customer.fullName} ${customer.phone}`
              .toLowerCase()
              .includes(customerQuery.trim().toLowerCase())
          )
        : [],
    [customerList, customerQuery]
  );
  const subtotal = Object.entries(cart).reduce(
    (sum, [id, quantity]) =>
      sum + (productList.find((item) => item.id === id)?.sellingPrice ?? 0) * quantity,
    0
  );
  const appliedDiscount = useMock ? Math.min(Math.max(0, discount), subtotal) : 0;
  const total = subtotal - appliedDiscount;
  const selectedCustomer = customerList.find((customer) => customer.id === customerId);
  const hasInsufficientStock = !useMock && Object.entries(cart).some(
    ([id, quantity]) => quantity > (availableByProduct[id] ?? 0)
  );

  function add(id: string) {
    if (!useMock && (availableByProduct[id] ?? 0) <= (cart[id] ?? 0)) {
      setMessage("Số lượng trong kho không đủ cho sản phẩm này.");
      return;
    }
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    setMessage("");
  }

  function changeQuantity(id: string, delta: number) {
    if (delta > 0 && !useMock &&
        (cart[id] ?? 0) >= (availableByProduct[id] ?? 0)) {
      setMessage("Số lượng trong kho không đủ cho sản phẩm này.");
      return;
    }
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

  async function pay() {
    if (!Object.keys(cart).length) {
      setMessage("Đơn hàng chưa có sản phẩm.");
      return;
    }

    setSaving(true);
    setMessage("");
    let createdOrder: Awaited<ReturnType<typeof createPosOrder>> | null = null;
    try {
      if (useMock) {
        const orderCode = `POS-${Date.now().toString().slice(-6)}`;
        setMessage(
          `Đã tạo đơn ${orderCode} · ${paymentMethod === "cash" ? "tiền mặt" : paymentMethod === "qr" ? "VietQR" : "thẻ"} · ${selectedCustomer?.fullName ?? "Khách vãng lai"} (bản mô phỏng).`
        );
      } else {
        createdOrder = await createPosOrder({
          customerId: selectedCustomer?.id ?? null,
          warehouseId,
          items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }))
        });
        const discountedOrder = couponCode.trim()
          ? await applyOrderCoupon(createdOrder.id, couponCode.trim())
          : createdOrder;
        const payment = await createPayment(createdOrder.id, {
          paymentMethod: paymentMethod === "cash" ? "Cash" : "BankTransfer"
        });
        setMessage(
          `Đã tạo đơn ${discountedOrder.code} · ${formatCurrency(discountedOrder.totalAmount)} · ${payment.status === "Paid" ? "Đã thanh toán" : "Chờ xác nhận chuyển khoản"} · ${selectedCustomer?.fullName ?? "Khách vãng lai"}.`
        );
      }
      setCart({});
      setDiscount(0);
      setCouponCode("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Không thể hoàn tất đơn hàng.";
      if (createdOrder) {
        setCart({});
        setMessage(`Đơn ${createdOrder.code} đã được tạo nhưng bước giảm giá hoặc thanh toán thất bại: ${errorMessage}`);
      } else {
        setLoadError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  function startNewOrder() {
    setCart({});
    setCustomerId(null);
    setCustomerQuery("");
    setDiscount(0);
    setCouponCode("");
    setMessage("");
    setLoadError("");
  }

  return (
    <>
      <PageHeader
        eyebrow="BÁN HÀNG › POINT OF SALE"
        title="Bán hàng tại quầy (POS)"
        description="Chọn sản phẩm, tra cứu khách hàng, áp dụng giảm giá và ghi nhận thanh toán."
        action={<button onClick={startNewOrder} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white">⌘ F2 Đơn mới</button>}
      />
      {loadError && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{loadError}</div>}
      {message && <div role="status" className="mb-4 rounded-lg border border-[#b7dfc7] bg-[#effaf2] px-4 py-3 text-xs text-[#065f46]">{message}</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-4 flex gap-2 rounded-xl border border-[#dfe8dd] bg-white p-3">
            <input autoFocus className="min-w-0 flex-1 rounded-lg border p-3 text-xs" placeholder="Tìm sản phẩm hoặc SKU..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          {!useMock && (
            <label className="mb-4 block rounded-xl border border-[#dfe8dd] bg-white p-3 text-xs font-semibold">
              Kho xuất hàng
              <select
                className="mt-2 w-full rounded-lg border p-3 text-xs font-normal"
                value={warehouseId}
                onChange={(event) => { void loadWarehouseStock(event.target.value); setMessage(""); }}
                disabled={loading || saving || warehouseList.length === 0}
              >
                {warehouseList.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
              {stockLoading && <small className="mt-1 block font-normal text-[#66736a]">Đang tải tồn kho...</small>}
            </label>
          )}
          {loading ? (
            <p className="rounded-xl border border-[#dfe8dd] bg-white p-8 text-center text-xs text-[#66736a]">Đang tải sản phẩm và khách hàng...</p>
          ) : visibleProducts.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {visibleProducts.map((product) => (
                <button type="button" onClick={() => add(product.id)} disabled={!useMock && (stockLoading || (availableByProduct[product.id] ?? 0) <= (cart[product.id] ?? 0))} className="rounded-xl border border-[#dfe8dd] bg-white p-3 text-left hover:border-[#006948] disabled:cursor-not-allowed disabled:opacity-50" key={product.id}>
                  <div className="h-24 rounded bg-cover bg-center" style={{ backgroundImage: `url(${product.mainImageUrl})` }} />
                  <small className="mt-2 block text-[10px] text-[#66736a]">{product.code}</small>
                  <b className="mt-1 block truncate text-xs">{product.name}</b>
                  <span className="text-sm font-bold text-[#006948]">{formatCurrency(product.sellingPrice)}</span>
                  {!useMock && <small className="mt-1 block text-[10px] text-[#66736a]">Tồn khả dụng: {availableByProduct[product.id] ?? 0} {product.unitName}</small>}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[#dfe8dd] bg-white p-8 text-center text-xs text-[#66736a]">Không tìm thấy sản phẩm.</p>
          )}
        </section>
        <aside className="h-fit rounded-xl border border-[#dfe8dd] bg-white p-4 xl:sticky xl:top-16">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Đơn đang thu</h2><StatusBadge>{Object.keys(cart).length} sản phẩm</StatusBadge></div>
          <div className="relative mb-3">
            <input className="w-full rounded-lg border p-3 text-xs" placeholder="Tìm khách theo tên hoặc số điện thoại..." value={customerQuery} onChange={(event) => { setCustomerQuery(event.target.value); setCustomerId(null); }} />
            {customerResults.length > 0 && <div className="absolute left-0 right-0 top-full z-10 rounded-lg border bg-white p-1 shadow-lg">{customerResults.map((customer) => <button type="button" key={customer.id} className="block w-full rounded p-2 text-left text-xs hover:bg-[#f2f7ef]" onClick={() => { setCustomerId(customer.id); setCustomerQuery(customer.phone); }}>{customer.fullName} · {customer.phone}</button>)}</div>}
          </div>
          <div className="mb-4 flex items-center justify-between rounded-lg bg-[#f2f7ef] p-3 text-xs">
            <span>{selectedCustomer ? `${selectedCustomer.fullName}${selectedCustomer.memberTier ? ` · ${selectedCustomer.memberTier}` : ""}` : "Khách vãng lai"}</span>
            {selectedCustomer && <IconButton label="Bỏ chọn khách" onClick={() => { setCustomerId(null); setCustomerQuery(""); }}>×</IconButton>}
          </div>
          <div className="space-y-2">
            {Object.entries(cart).map(([id, quantity]) => {
              const product = productList.find((item) => item.id === id);
              return product ? <div className="flex items-center justify-between rounded-lg border border-[#e7eee4] p-3 text-xs" key={id}><span className="min-w-0"><b className="block truncate">{product.name}</b><small className="text-[#66736a]">{formatCurrency(product.sellingPrice)} · {product.unitName}{!useMock && ` · Tồn: ${availableByProduct[id] ?? 0}`}</small></span><span className="ml-2 flex items-center gap-2"><IconButton label="Giảm số lượng" onClick={() => changeQuantity(id, -1)}>−</IconButton><b>{quantity}</b><button type="button" aria-label="Tăng số lượng" onClick={() => changeQuantity(id, 1)} disabled={!useMock && quantity >= (availableByProduct[id] ?? 0)} className="rounded-lg border border-[#dfe8dd] px-2.5 py-1.5 text-xs text-[#006948] transition hover:bg-[#eff7ed] disabled:cursor-not-allowed disabled:opacity-50">＋</button></span></div> : null;
            })}
          </div>
          {useMock ? (
            <label className="my-4 block text-xs font-semibold">Giảm giá đơn hàng (đ)
              <input className="mt-1 w-full rounded-lg border p-3 text-xs font-normal" type="number" min={0} max={subtotal} step={1000} value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))} />
            </label>
          ) : (
            <label className="my-4 block text-xs font-semibold">Mã giảm giá
              <input className="mt-1 w-full rounded-lg border p-3 text-xs font-normal uppercase" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Nhập mã giảm giá" />
              <small className="mt-1 block font-normal text-[#66736a]">Mã sẽ được xác nhận khi tạo đơn.</small>
            </label>
          )}
          <div className="space-y-3 border-t pt-4 text-xs"><div className="flex justify-between"><span>Tạm tính</span><b>{formatCurrency(subtotal)}</b></div><div className="flex justify-between"><span>Giảm giá</span><b className="text-[#006948]">−{formatCurrency(appliedDiscount)}</b></div><div className="flex justify-between text-lg"><b>Khách phải trả</b><b className="text-[#006948]">{formatCurrency(total)}</b></div></div>
          <div className={`mt-4 grid gap-2 ${useMock ? "grid-cols-3" : "grid-cols-2"}`}>{[["cash", "Tiền mặt"], ["qr", "Chuyển khoản"], ...(useMock ? [["card", "Thẻ"]] : [])].map(([value, label]) => <button type="button" key={value} onClick={() => setPaymentMethod(value as typeof paymentMethod)} className={`rounded-lg p-3 text-[10px] ${paymentMethod === value ? "bg-[#006948] text-white" : "bg-[#f2f7ef]"}`}>{label}</button>)}</div>
          <button disabled={saving || loading || stockLoading || hasInsufficientStock || (!useMock && !warehouseId) || Object.keys(cart).length === 0} onClick={pay} className="mt-3 w-full rounded-xl bg-[#006948] py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "ĐANG XỬ LÝ..." : "TẠO ĐƠN & THANH TOÁN"}</button>
          {useMock && <p className="mt-2 text-center text-[10px] text-[#66736a]">Chế độ mô phỏng · thao tác không lưu lên máy chủ</p>}
        </aside>
      </div>
    </>
  );
}
