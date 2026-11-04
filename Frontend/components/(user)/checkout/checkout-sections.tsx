"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addressRegions } from "../../../data/address-regions";
import { getApiErrorMessage } from "../../../lib/axios/errors";
import { fallbackImage, formatCurrency } from "../../../lib/formatters";
import { useAuth } from "../../../providers/auth-provider";
import { useCart } from "../../../providers/cart-provider";
import {
  createAccountAddress,
  getAccountAddresses,
  setAccountDefaultAddress,
  updateAccountAddress
} from "../../../services/customers/customer.service";
import { productRepository } from "../../../services/products/product.repository";
import { orderRepository } from "../../../services/orders/order.repository";
import type { Address, AddressRequest, Product } from "../../../types/api";

const emptyAddress: AddressRequest = {
  receiverName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  detailAddress: "",
  isDefault: false
};

function StepProgress() {
  return (
    <div className="mb-6 flex justify-center gap-8 rounded-lg bg-[#eaf4e7] p-4 text-xs sm:gap-12">
      <b className="text-[var(--green)]">✓ 1. Giỏ hàng</b>
      <b className="text-[var(--green)]">● 2. Giao hàng & Thanh toán</b>
      <span className="text-[var(--muted)]">3. Đặt hàng thành công</span>
    </div>
  );
}

export function CheckoutSections() {
  const { session, loading: authLoading } = useAuth();
  const { cart, clear } = useCart();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState<AddressRequest>(emptyAddress);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const productIds = Object.keys(cart);
    if (!session?.userId) {
      if (!authLoading) {
        const timer = window.setTimeout(() => setLoadingData(false), 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingData(true);
      Promise.all([
        Promise.allSettled(productIds.map((id) => productRepository.getProductById(id))),
        getAccountAddresses()
      ])
        .then(([productResults, addressResult]) => {
          if (!active) return;
          setProducts(
            productResults
              .filter(
                (result): result is PromiseFulfilledResult<Product> =>
                  result.status === "fulfilled"
              )
              .map((result) => result.value)
          );
          setAddresses(addressResult);
          const defaultAddress = addressResult.find((address) => address.isDefault);
          setSelectedAddressId(defaultAddress?.id ?? addressResult[0]?.id ?? "");
          setShowAddressForm(addressResult.length === 0);
        })
        .catch((cause) => {
          if (active) setError(getApiErrorMessage(cause));
        })
        .finally(() => {
          if (active) setLoadingData(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [authLoading, cart, session?.userId]);

  const entries = useMemo(
    () =>
      products
        .map((product) => ({ product, quantity: cart[product.id] ?? 0 }))
        .filter((entry) => entry.quantity > 0),
    [cart, products]
  );
  const subtotal = entries.reduce(
    (total, entry) => total + entry.product.sellingPrice * entry.quantity,
    0
  );

  function updateAddressField(field: keyof AddressRequest, value: string | boolean) {
    setAddressForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "province" ? { district: "" } : {})
    }));
  }

  function startCreateAddress() {
    setEditingAddressId(null);
    setAddressForm(emptyAddress);
    setFormError("");
    setShowAddressForm(true);
  }

  function startEditAddress(address: Address) {
    setEditingAddressId(address.id);
    setAddressForm({
      receiverName: address.receiverName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault
    });
    setFormError("");
    setShowAddressForm(true);
  }

  function validateAddress(): string {
    if (!addressForm.receiverName.trim() || addressForm.receiverName.trim().length > 200) {
      return "Tên người nhận không được trống và tối đa 200 ký tự.";
    }
    if (!/^0\d{9,10}$/.test(addressForm.phone.replace(/\s/g, ""))) {
      return "Số điện thoại phải gồm 10 hoặc 11 chữ số và bắt đầu bằng 0.";
    }
    if (!addressRegions[addressForm.province]) return "Vui lòng chọn tỉnh / thành phố.";
    if (!addressRegions[addressForm.province].includes(addressForm.district)) {
      return "Vui lòng chọn quận / huyện hợp lệ.";
    }
    if (!addressForm.ward.trim() || !addressForm.detailAddress.trim()) {
      return "Vui lòng nhập phường / xã và địa chỉ chi tiết.";
    }
    return "";
  }

  async function submitAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.userId) return;
    const validationError = validateAddress();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSavingAddress(true);
    setError("");
    setFormError("");
    try {
      const saved = editingAddressId
        ? await updateAccountAddress(editingAddressId, addressForm)
        : await createAccountAddress(addressForm);
      if (editingAddressId && addressForm.isDefault) {
        await setAccountDefaultAddress(saved.id);
      }
      setAddresses((current) => {
        const next = editingAddressId
          ? current.map((address) => address.id === saved.id ? saved : address)
          : [...current, saved];
        return addressForm.isDefault
          ? next.map((address) => ({ ...address, isDefault: address.id === saved.id }))
          : next;
      });
      setSelectedAddressId(saved.id);
      setAddressForm(emptyAddress);
      setEditingAddressId(null);
      setShowAddressForm(false);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setSavingAddress(false);
    }

  }

  async function makeDefaultAddress(addressId: string) {
    setError("");
    try {
      await setAccountDefaultAddress(addressId);
      setAddresses((current) =>
        current.map((address) => ({ ...address, isDefault: address.id === addressId }))
      );
      setSelectedAddressId(addressId);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  async function submit() {
    if (!session?.userId || !selectedAddressId || !entries.length) return;
    setLoading(true);
    setError("");
    try {
      await orderRepository.createOnlineOrder({
        customerId: session.userId,
        shippingAddressId: selectedAddressId,
        shippingMethodId: "delivery-2h",
        warehouseId: "warehouse-central",
        note: "Giao trong giờ hành chính",
        items: entries.map(({ product, quantity }) => ({
          productId: product.id,
          quantity
        }))
      });
      clear();
      router.push("/dat-hang/thanh-cong");
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-[600px] max-w-7xl px-6 py-6">
      <StepProgress />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_.8fr]">
        <section className="space-y-4">
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">1. Địa chỉ nhận hàng tươi</h2>
              {addresses.length >= 0 && (
                <button
                  type="button"
                  className="text-xs text-[var(--green)]"
                  onClick={() => showAddressForm ? setShowAddressForm(false) : startCreateAddress()}
                >
                  {showAddressForm ? "Đóng form" : "+ Thêm địa chỉ"}
                </button>
              )}
            </div>
            {loadingData ? (
              <p className="rounded-lg bg-[#f1f8ee] p-4 text-sm text-[var(--muted)]">
                Đang tải thông tin giao hàng...
              </p>
            ) : addresses.length ? (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${
                      selectedAddressId === address.id
                        ? "border-[var(--green)] bg-[#f1f8ee]"
                        : "border-[var(--line)]"
                    }`}
                    key={address.id}
                  >
                    <input
                      type="radio"
                      name="shippingAddress"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                    />
                    <span className="flex-1">
                      <b>
                        {address.receiverName} · {address.phone}
                      </b>
                      <small className="mt-1 block text-[var(--muted)]">
                        {address.detailAddress}, {address.ward}, {address.district},{" "}
                        {address.province}
                      </small>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2 text-[11px]">
                      <button
                        type="button"
                        className="text-[var(--green)] underline"
                        onClick={() => startEditAddress(address)}
                      >
                        Xem chi tiết
                      </button>
                      {address.isDefault ? (
                        <b className="text-[var(--green)]">Mặc định</b>
                      ) : (
                        <button
                          type="button"
                          className="text-[var(--muted)] underline"
                          onClick={() => makeDefaultAddress(address.id)}
                        >
                          Đặt mặc định
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 rounded-lg bg-[#fff7ed] p-4 text-sm text-[#9a4d16]">
                Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ bên dưới.
              </p>
            )}
            {showAddressForm && (
              <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitAddress}>
                {([
                  ["receiverName", "Tên người nhận"],
                  ["phone", "Số điện thoại"],
                  ["ward", "Phường / Xã"],
                  ["detailAddress", "Địa chỉ chi tiết"]
                ] as const).map(([field, label]) => (
                  <label className={field === "detailAddress" ? "md:col-span-2" : ""} key={field}>
                    <span className="mb-1 block text-xs font-semibold">{label}</span>
                    <input
                      required
                      value={addressForm[field]}
                      onChange={(event) => updateAddressField(field, event.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] p-3 text-sm outline-none focus:border-[var(--green)]"
                    />
                  </label>
                ))}
                <label>
                  <span className="mb-1 block text-xs font-semibold">Tỉnh / Thành phố</span>
                  <select
                    required
                    value={addressForm.province}
                    onChange={(event) => updateAddressField("province", event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-white p-3 text-sm"
                  >
                    <option value="">Chọn tỉnh / thành phố</option>
                    {Object.keys(addressRegions).map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold">Quận / Huyện</span>
                  <select
                    required
                    disabled={!addressForm.province}
                    value={addressForm.district}
                    onChange={(event) => updateAddressField("district", event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-white p-3 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Chọn quận / huyện</option>
                    {(addressRegions[addressForm.province] ?? []).map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </label>
                {formError && (
                  <p className="rounded-lg bg-red-100 p-3 text-xs text-red-700 md:col-span-2">
                    {formError}
                  </p>
                )}
                <label className="flex items-center gap-2 text-xs md:col-span-2">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(event) => updateAddressField("isDefault", event.target.checked)}
                  />
                  Đặt làm địa chỉ mặc định
                </label>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="rounded-lg bg-[var(--green)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50 md:col-span-2"
                >
                  {savingAddress ? "Đang lưu..." : editingAddressId ? "Cập nhật địa chỉ" : "Lưu địa chỉ"}
                </button>
              </form>
            )}
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">2. Phương thức vận chuyển</h2>
            <div className="rounded-lg border border-[var(--green)] bg-[#effaf2] p-4">
              ◉ Giao Siêu Tốc 2 Giờ ⚡
              <small className="mt-2 block text-[var(--muted)]">
                Dành cho rau lá, giao trong thùng cách nhiệt lạnh
              </small>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">3. Phương thức thanh toán an toàn</h2>
            {[
              "Chuyển khoản VietQR Siêu Tốc 24/7",
              "Thanh toán khi nhận hàng (COD)",
              "Ví điện tử VNPay / MoMo",
              "Thẻ tín dụng / Ghi nợ"
            ].map((method, index) => (
              <label className="block border-b border-[var(--line)] p-3" key={method}>
                <input type="radio" name="payment" defaultChecked={index === 0} />{" "}
                <b className="ml-2">{method}</b>
                <small className="mt-1 block pl-6 text-[var(--muted)]">
                  {index === 0 ? "Khuyến nghị · Tự động xác nhận đơn hàng" : "Thanh toán an toàn, tiện lợi"}
                </small>
              </label>
            ))}
            <p className="mt-4 rounded-lg bg-[#e9faf1] p-3 text-xs text-[var(--deep)]">
              ✓ Cam kết hoàn tiền 100% trong 24 giờ nếu nông sản không đạt yêu cầu.
            </p>
          </div>
        </section>
        <aside className="h-fit rounded-xl border border-[var(--line)] bg-white p-5 lg:sticky lg:top-4">
          <h2 className="mb-4 text-lg font-bold">Đơn Hàng Của Bạn</h2>
          {entries.map(({ product, quantity }) => (
            <div className="my-3 flex justify-between gap-3 text-xs" key={product.id}>
              <span className="flex gap-2">
                <span
                  className="h-10 w-10 shrink-0 rounded bg-cover bg-center"
                  style={{ backgroundImage: `url(${product.mainImageUrl || fallbackImage})` }}
                />
                <span>
                  {product.name}
                  <small className="block text-[var(--muted)]">x{quantity}</small>
                </span>
              </span>
              <b>{formatCurrency(product.sellingPrice * quantity)}</b>
            </div>
          ))}
          <hr />
          <div className="my-4 flex justify-between text-xs">
            <span>Tạm tính</span>
            <b>{formatCurrency(subtotal)}</b>
          </div>
          <div className="my-4 flex justify-between">
            <b>Tổng cộng</b>
            <b className="text-2xl text-[var(--green)]">{formatCurrency(subtotal)}</b>
          </div>
          {error && <p className="mb-3 rounded bg-red-100 p-3 text-xs text-red-700">{error}</p>}
          <button
            disabled={loading || loadingData || !entries.length || !selectedAddressId}
            onClick={submit}
            className="w-full rounded-lg bg-[var(--green)] px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "🔒 Xác nhận đặt hàng"}
          </button>
        </aside>
      </div>
    </main>
  );
}
