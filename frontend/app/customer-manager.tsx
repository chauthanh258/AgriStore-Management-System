"use client";

import {
  ArrowUpRight, BadgeCheck, CalendarDays, ChevronLeft, ChevronRight, CircleUserRound,
  LogOut, Mail, MapPin, Pencil, Phone, Plus, RefreshCw, Search, Sprout, Star,
  Trash2, UsersRound, X,
} from "lucide-react";
import { FormEvent, useDeferredValue, useEffect, useState, useSyncExternalStore } from "react";

type Address = {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
};

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  loyaltyPoints: number;
  notes: string | null;
  addresses: Address[];
};

type CustomerPage = {
  items: Customer[];
  totalCount: number;
  totalPages: number;
};

type AddressBookItem = Address & {
  customerId: string;
  customerName: string;
};

type AddressBookPage = {
  items: AddressBookItem[];
  totalCount: number;
  totalPages: number;
};

type CustomerForm = {
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  notes: string;
};

type AddressForm = {
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
};

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5274").replace(/\/$/, "");
const blankCustomer: CustomerForm = { fullName: "", phone: "", email: "", gender: "", dateOfBirth: "", notes: "" };
const blankAddress: AddressForm = { receiverName: "", phone: "", province: "", district: "", ward: "", detailAddress: "", isDefault: false };
const tokenChangedEvent = "agristore-access-token-change";

function subscribeToToken(listener: () => void) {
  window.addEventListener(tokenChangedEvent, listener);
  return () => window.removeEventListener(tokenChangedEvent, listener);
}

function readToken() {
  return sessionStorage.getItem("agristore-access-token") ?? "";
}

function readServerToken() {
  return "";
}

async function apiRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null;
    throw new Error(problem?.detail || problem?.title || `Yêu cầu thất bại (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export default function CustomerManager() {
  const token = useSyncExternalStore(subscribeToToken, readToken, readServerToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeView, setActiveView] = useState<"customers" | "addresses">("customers");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [addressSearch, setAddressSearch] = useState("");
  const deferredAddressSearch = useDeferredValue(addressSearch);
  const [addressItems, setAddressItems] = useState<AddressBookItem[]>([]);
  const [addressPage, setAddressPage] = useState(1);
  const [addressPages, setAddressPages] = useState(1);
  const [addressCount, setAddressCount] = useState(0);
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerForm, setCustomerForm] = useState<CustomerForm>(blankCustomer);
  const [customerEditing, setCustomerEditing] = useState<Customer | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(blankAddress);
  const [addressEditing, setAddressEditing] = useState<Address | null>(null);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [addressDialog, setAddressDialog] = useState(false);
  const selected = customers.find((customer) => customer.id === selectedId) ?? null;
  const initials = selected?.fullName.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() ?? "";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiRequest<CustomerPage>(token, `/api/customers?page=${page}&pageSize=20&search=${encodeURIComponent(deferredSearch)}`)
      .then((result) => {
        if (cancelled) return;
        setError("");
        setCustomers(result.items);
        setTotalCount(result.totalCount);
        setPages(Math.max(result.totalPages, 1));
        setSelectedId((current) => result.items.some((customer) => customer.id === current)
          ? current
          : result.items[0]?.id ?? "");
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Không tải được danh sách khách hàng.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deferredSearch, page, refreshKey, token]);

  useEffect(() => {
    if (!token || activeView !== "addresses") return;
    let cancelled = false;
    apiRequest<AddressBookPage>(
      token,
      `/api/customers/addresses?page=${addressPage}&pageSize=20&search=${encodeURIComponent(deferredAddressSearch)}`,
    )
      .then((result) => {
        if (cancelled) return;
        setError("");
        setAddressItems(result.items);
        setAddressCount(result.totalCount);
        setAddressPages(Math.max(result.totalPages, 1));
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Không tải được sổ địa chỉ.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeView, addressPage, addressRefreshKey, deferredAddressSearch, token]);

  function refresh() { setRefreshKey((value) => value + 1); }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ accessToken: string; roles: string[] }>("", "/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!result.roles.some((role) => ["Admin", "Manager", "Staff"].includes(role))) {
        throw new Error("Tài khoản cần quyền Admin, Manager hoặc Staff để quản lý khách hàng.");
      }
      sessionStorage.setItem("agristore-access-token", result.accessToken);
      window.dispatchEvent(new Event(tokenChangedEvent));
      setPassword("");
      setNotice("Đăng nhập thành công.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Đăng nhập không thành công.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("agristore-access-token");
    window.dispatchEvent(new Event(tokenChangedEvent));
    setSelectedId("");
    setNotice("");
    setCustomers([]);
  }

  async function refreshSelected(customerId: string) {
    const customer = await apiRequest<Customer>(token, `/api/customers/${customerId}`);
    setCustomers((current) => current.map((item) => item.id === customer.id ? customer : item));
  }

  function beginCustomerEdit(customer?: Customer) {
    setCustomerEditing(customer ?? null);
    setCustomerForm(customer ? {
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email ?? "",
      gender: customer.gender ?? "",
      dateOfBirth: customer.dateOfBirth?.slice(0, 10) ?? "",
      notes: customer.notes ?? "",
    } : blankCustomer);
    setCustomerDialog(true);
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const body = {
      ...customerForm,
      email: customerForm.email || null,
      gender: customerForm.gender || null,
      dateOfBirth: customerForm.dateOfBirth || null,
      notes: customerForm.notes || null,
    };
    try {
      const saved = await apiRequest<Customer>(token,
        customerEditing ? `/api/customers/${customerEditing.id}` : "/api/customers",
        { method: customerEditing ? "PUT" : "POST", body: JSON.stringify(body) });
      setCustomerDialog(false);
      setNotice(customerEditing ? "Đã cập nhật hồ sơ khách hàng." : "Đã thêm khách hàng mới.");
      if (!customerEditing) setSelectedId(saved.id);
      if (customerEditing) {
        setCustomers((current) => current.map((item) => item.id === saved.id ? saved : item));
      } else {
        refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được khách hàng.");
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!window.confirm(`Xóa khách hàng ${customer.fullName}?`)) return;
    try {
      await apiRequest<void>(token, `/api/customers/${customer.id}`, { method: "DELETE" });
      setNotice("Đã xóa khách hàng.");
      setSelectedId("");
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xóa khách hàng.");
    }
  }

  function beginAddressEdit(address?: Address) {
    setAddressEditing(address ?? null);
    setAddressForm(address ? {
      receiverName: address.receiverName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault,
    } : {
      ...blankAddress,
      receiverName: selected?.fullName ?? "",
      phone: selected?.phone ?? "",
      isDefault: selected?.addresses.length === 0,
    });
    setAddressDialog(true);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      const addressBody: Omit<AddressForm, "isDefault"> = {
        receiverName: addressForm.receiverName,
        phone: addressForm.phone,
        province: addressForm.province,
        district: addressForm.district,
        ward: addressForm.ward,
        detailAddress: addressForm.detailAddress,
      };
      await apiRequest<Address>(token,
        addressEditing
          ? `/api/customers/${selected.id}/addresses/${addressEditing.id}`
          : `/api/customers/${selected.id}/addresses`,
        {
          method: addressEditing ? "PUT" : "POST",
          body: JSON.stringify(addressEditing ? addressBody : addressForm),
        });
      setAddressDialog(false);
      setNotice(addressEditing ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ giao hàng.");
      await refreshSelected(selected.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được địa chỉ.");
    }
  }

  async function setDefaultAddress(address: Address) {
    if (!selected) return;
    try {
      await apiRequest<void>(token, `/api/customers/${selected.id}/addresses/${address.id}/default`, { method: "PATCH" });
      await refreshSelected(selected.id);
      setNotice("Đã đặt địa chỉ mặc định.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không cập nhật được địa chỉ mặc định.");
    }
  }

  async function deleteAddress(address: Address) {
    if (!selected || !window.confirm(`Xóa địa chỉ tại ${address.detailAddress}?`)) return;
    try {
      await apiRequest<void>(token, `/api/customers/${selected.id}/addresses/${address.id}`, { method: "DELETE" });
      await refreshSelected(selected.id);
      setNotice("Đã xóa địa chỉ.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xóa địa chỉ.");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActiveView("customers")}><span className="brand-mark"><Sprout size={21} /></span><span>agri<span>store</span></span></button>
        <div className="workspace-label">VẬN HÀNH CỬA HÀNG</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          <button className={`nav-link ${activeView === "customers" ? "active" : ""}`} onClick={() => setActiveView("customers")}><UsersRound size={18} /> Khách hàng</button>
          <button className={`nav-link ${activeView === "addresses" ? "active" : ""}`} onClick={() => setActiveView("addresses")}><MapPin size={18} /> Sổ địa chỉ</button>
        </nav>
        <div className="sidebar-bottom"><span className="store-dot" /> Kho cửa hàng · Local</div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumbs"><span>Vận hành</span><ChevronRight size={14} /><strong>{activeView === "customers" ? "Khách hàng" : "Sổ địa chỉ"}</strong></div>
          <div className="topbar-actions"><span className="environment"><span /> Môi trường thử nghiệm</span>{token ? <button className="icon-button" title="Đăng xuất" aria-label="Đăng xuất" onClick={logout}><LogOut size={17} /></button> : null}</div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><p className="eyebrow">{activeView === "customers" ? "QUAN HỆ KHÁCH HÀNG" : "ĐỊA CHỈ GIAO NHẬN"}</p><h1>{activeView === "customers" ? "Khách hàng" : "Sổ địa chỉ"}</h1><p className="page-subtitle">{activeView === "customers" ? "Hồ sơ khách hàng và địa chỉ nhận hàng được quản lý tại một nơi." : "Tất cả địa chỉ giao hàng, có thể tìm theo khách hàng, người nhận hoặc khu vực."}</p></div>
            {activeView === "customers"
              ? <button className="primary-button" onClick={() => beginCustomerEdit()} disabled={!token}><Plus size={17} /> Thêm khách hàng</button>
              : <button className="secondary-button" onClick={() => setAddressRefreshKey((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Làm mới</button>}
          </div>

          <div className="summary-strip">
            <div className="summary-item"><span className={`summary-icon ${activeView === "customers" ? "green" : "yellow"}`}>{activeView === "customers" ? <UsersRound size={18} /> : <MapPin size={18} />}</span><div><span className="summary-label">{activeView === "customers" ? "TỔNG KHÁCH HÀNG" : "TỔNG ĐỊA CHỈ"}</span><strong>{(activeView === "customers" ? totalCount : addressCount).toLocaleString("vi-VN")}</strong></div></div>
            {activeView === "customers" ? <div className="summary-item"><span className="summary-icon yellow"><BadgeCheck size={18} /></span><div><span className="summary-label">ĐIỂM TÍCH LŨY</span><strong>{selected?.loyaltyPoints.toLocaleString("vi-VN") ?? "—"}<small>{selected ? " điểm" : " Chọn hồ sơ"}</small></strong></div></div> : null}
            <div className="summary-caption"><span className="caption-rule" /> Dữ liệu đồng bộ trực tiếp từ AgriStore API</div>
          </div>

          {error ? <div className="alert error-alert" role="alert"><span>{error}</span><button className="icon-button" onClick={() => setError("")} aria-label="Đóng thông báo"><X size={16} /></button></div> : null}
          {notice ? <div className="alert success-alert" role="status"><span>{notice}</span><button className="icon-button" onClick={() => setNotice("")} aria-label="Đóng thông báo"><X size={16} /></button></div> : null}

          {activeView === "customers" ? <div className="workspace-grid">
            <section className="customer-list-panel" aria-label="Danh sách khách hàng">
              <div className="panel-heading"><div><h2>Danh sách</h2><span>{totalCount.toLocaleString("vi-VN")} hồ sơ</span></div><button className="icon-button" title="Tải lại danh sách" aria-label="Tải lại danh sách" onClick={refresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /></button></div>
              <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm tên, số điện thoại..." aria-label="Tìm khách hàng" /><kbd>/</kbd></label>
              <div className="customer-list" aria-live="polite">
                {!token ? <div className="empty-state"><CircleUserRound size={25} /><strong>Đăng nhập để xem dữ liệu</strong><span>Dùng tài khoản Admin, Manager hoặc Staff.</span></div> : null}
                {token && loading && customers.length === 0 ? <div className="empty-state">Đang tải hồ sơ...</div> : null}
                {token && !loading && customers.length === 0 ? <div className="empty-state"><UsersRound size={25} /><strong>Chưa có khách hàng</strong><span>Thêm hồ sơ đầu tiên để bắt đầu.</span></div> : null}
                {customers.map((customer, index) => (
                  <button className={`customer-row ${selectedId === customer.id ? "selected" : ""}`} key={customer.id} onClick={() => setSelectedId(customer.id)}>
                    <span className={`customer-avatar avatar-${index % 4}`}>{customer.fullName.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <span className="customer-row-copy"><strong>{customer.fullName}</strong><span>{customer.phone}</span></span><span className="row-chevron"><ChevronRight size={16} /></span>
                  </button>
                ))}
              </div>
              <div className="pagination"><span>Trang {page} / {pages}</span><div><button className="icon-button" title="Trang trước" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><button className="icon-button" title="Trang sau" aria-label="Trang sau" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><ChevronRight size={16} /></button></div></div>
            </section>

            <section className="profile-panel" aria-label="Chi tiết khách hàng">
              {selected ? <>
                <div className="profile-header"><div className="profile-identity"><div className="profile-avatar">{initials}</div><div><span className="profile-overline">HỒ SƠ KHÁCH HÀNG</span><h2>{selected.fullName}</h2><span className="profile-id">Mã hồ sơ · {selected.id.slice(0, 8).toUpperCase()}</span></div></div><div className="profile-actions"><button className="secondary-button" onClick={() => beginCustomerEdit(selected)}><Pencil size={15} /> Chỉnh sửa</button><button className="icon-button danger-icon" title="Xóa khách hàng" aria-label="Xóa khách hàng" onClick={() => deleteCustomer(selected)}><Trash2 size={16} /></button></div></div>
                <div className="profile-facts">
                  <div className="fact"><Phone size={16} /><span><small>SỐ ĐIỆN THOẠI</small><strong>{selected.phone}</strong></span></div>
                  <div className="fact"><Mail size={16} /><span><small>EMAIL</small><strong>{selected.email || "Chưa cập nhật"}</strong></span></div>
                  <div className="fact"><CalendarDays size={16} /><span><small>NGÀY SINH</small><strong>{selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</strong></span></div>
                  <div className="fact"><Star size={16} /><span><small>HẠNG THÀNH VIÊN</small><strong>{selected.loyaltyPoints >= 1000 ? "AgriClub · Vàng" : "AgriClub · Thành viên"}</strong></span></div>
                </div>
                <div className="address-section" id="addresses">
                  <div className="section-heading"><div><p className="eyebrow">GIAO NHẬN</p><h3>Sổ địa chỉ <span>{selected.addresses.length.toString().padStart(2, "0")}</span></h3></div><button className="secondary-button" onClick={() => beginAddressEdit()}><Plus size={15} /> Thêm địa chỉ</button></div>
                  {selected.addresses.length === 0 ? <div className="address-empty"><MapPin size={19} /><span>Khách hàng chưa lưu địa chỉ giao hàng.</span><button onClick={() => beginAddressEdit()}>Thêm địa chỉ</button></div> : <div className="address-list">
                    {selected.addresses.map((address) => <article className={`address-row ${address.isDefault ? "default-address" : ""}`} key={address.id}>
                      <span className="address-pin"><MapPin size={17} /></span><div className="address-copy"><div className="address-title"><strong>{address.receiverName}</strong>{address.isDefault ? <span className="default-tag"><Star size={11} fill="currentColor" /> MẶC ĐỊNH</span> : null}</div><p>{address.detailAddress}, {address.ward}, {address.district}, {address.province}</p><span className="address-phone">{address.phone}</span></div>
                      <div className="address-actions">{!address.isDefault ? <button className="text-action" onClick={() => setDefaultAddress(address)} title="Đặt làm mặc định"><ArrowUpRight size={14} /><span>Mặc định</span></button> : null}<button className="icon-button" onClick={() => beginAddressEdit(address)} aria-label="Sửa địa chỉ" title="Sửa địa chỉ"><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => deleteAddress(address)} aria-label="Xóa địa chỉ" title="Xóa địa chỉ"><Trash2 size={15} /></button></div>
                    </article>)}
                  </div>}
                </div>
                <div className="customer-note"><span className="note-mark">i</span><span>{selected.notes || "Chưa có ghi chú chăm sóc cho khách hàng này."}</span></div>
              </> : <div className="detail-empty"><div className="empty-illustration"><UsersRound size={28} /></div><h2>Chọn hồ sơ khách hàng</h2><p>Thông tin liên hệ, điểm thành viên và địa chỉ giao nhận sẽ hiển thị tại đây.</p></div>}
            </section>
          </div> : <section className="address-book-panel" aria-label="Danh sách toàn bộ địa chỉ">
            <div className="panel-heading"><div><h2>Toàn bộ địa chỉ</h2><span>{addressCount.toLocaleString("vi-VN")} mục</span></div><span className="address-book-hint">Chọn một dòng để mở hồ sơ khách hàng</span></div>
            <label className="search-box address-book-search"><Search size={17} /><input value={addressSearch} onChange={(event) => { setAddressSearch(event.target.value); setAddressPage(1); }} placeholder="Tìm khách, người nhận, số điện thoại, khu vực..." aria-label="Tìm trong sổ địa chỉ" /></label>
            {!token ? <div className="empty-state"><CircleUserRound size={25} /><strong>Đăng nhập để xem dữ liệu</strong><span>Dùng tài khoản Admin, Manager hoặc Staff.</span></div> : null}
            {token && loading && addressItems.length === 0 ? <div className="empty-state">Đang tải sổ địa chỉ...</div> : null}
            {token && !loading && addressItems.length === 0 ? <div className="empty-state"><MapPin size={25} /><strong>Chưa có địa chỉ</strong><span>Sổ địa chỉ sẽ hiển thị địa chỉ của tất cả khách hàng.</span></div> : null}
            {addressItems.length > 0 ? <div className="address-book-list">
              <div className="address-book-header"><span>KHÁCH HÀNG / NGƯỜI NHẬN</span><span>ĐỊA CHỈ</span><span>LIÊN HỆ</span><span>TRẠNG THÁI</span></div>
              {addressItems.map((address) => <button className="address-book-row" key={address.id} onClick={() => { setSearch(address.customerName); setPage(1); setSelectedId(address.customerId); setActiveView("customers"); }}>
                <span className="address-book-customer"><span className="customer-avatar">{address.customerName.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase()}</span><span><strong>{address.customerName}</strong><small>{address.receiverName}</small></span></span>
                <span className="address-book-location">{address.detailAddress}, {address.ward}, {address.district}, {address.province}</span>
                <span className="address-book-phone">{address.phone}</span>
                <span>{address.isDefault ? <span className="default-tag"><Star size={11} fill="currentColor" /> MẶC ĐỊNH</span> : <span className="secondary-label">Địa chỉ phụ</span>}</span>
              </button>)}
            </div> : null}
            <div className="pagination address-book-pagination"><span>Trang {addressPage} / {addressPages}</span><div><button className="icon-button" title="Trang trước" aria-label="Trang trước" disabled={addressPage <= 1} onClick={() => setAddressPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><button className="icon-button" title="Trang sau" aria-label="Trang sau" disabled={addressPage >= addressPages} onClick={() => setAddressPage((value) => Math.min(addressPages, value + 1))}><ChevronRight size={16} /></button></div></div>
          </section>}
          <footer className="page-footer"><span>AGRISTORE · CUSTOMER MANAGEMENT</span><a href={`${apiBase}/swagger`} target="_blank" rel="noreferrer">API docs <ArrowUpRight size={13} /></a></footer>
        </div>
      </section>

      {!token ? <div className="login-overlay"><form className="login-panel" onSubmit={login}>
        <span className="login-symbol"><Sprout size={23} /></span><p className="eyebrow">AGRISTORE · ADMIN</p><h2>Đăng nhập vận hành</h2><p className="login-copy">Sử dụng tài khoản có quyền Admin, Manager hoặc Staff.</p>
        {error ? <div className="login-error" role="alert">{error}</div> : null}
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@agristore.vn" /></label>
        <label>Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" /></label>
        <button className="primary-button login-button" type="submit" disabled={loading}>{loading ? "Đang xác thực..." : "Đăng nhập"}<ArrowUpRight size={16} /></button><small className="login-foot">Kết nối API tại {apiBase}</small>
      </form></div> : null}

      {customerDialog ? <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomerDialog(false); }}><form className="dialog" onSubmit={saveCustomer}>
        <div className="dialog-heading"><div><p className="eyebrow">HỒ SƠ KHÁCH HÀNG</p><h2>{customerEditing ? "Chỉnh sửa hồ sơ" : "Thêm khách hàng"}</h2></div><button type="button" className="icon-button" onClick={() => setCustomerDialog(false)} aria-label="Đóng"><X size={18} /></button></div>
        <div className="form-grid">
          <label className="full-field">Họ và tên<input required maxLength={200} value={customerForm.fullName} onChange={(event) => setCustomerForm({ ...customerForm, fullName: event.target.value })} /></label>
          <label>Số điện thoại<input required maxLength={30} value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label>
          <label>Email<input type="email" maxLength={256} value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} /></label>
          <label>Giới tính<select value={customerForm.gender} onChange={(event) => setCustomerForm({ ...customerForm, gender: event.target.value })}><option value="">Chưa chọn</option><option value="Female">Nữ</option><option value="Male">Nam</option><option value="Other">Khác</option></select></label>
          <label>Ngày sinh<input type="date" value={customerForm.dateOfBirth} onChange={(event) => setCustomerForm({ ...customerForm, dateOfBirth: event.target.value })} /></label>
          <label className="full-field">Ghi chú<textarea rows={3} maxLength={1000} value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} /></label>
        </div>
        <div className="dialog-footer"><button type="button" className="secondary-button" onClick={() => setCustomerDialog(false)}>Hủy</button><button type="submit" className="primary-button"><Plus size={16} /> Lưu hồ sơ</button></div>
      </form></div> : null}

      {addressDialog && selected ? <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddressDialog(false); }}><form className="dialog" onSubmit={saveAddress}>
        <div className="dialog-heading"><div><p className="eyebrow">SỔ ĐỊA CHỈ · {selected.fullName}</p><h2>{addressEditing ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h2></div><button type="button" className="icon-button" onClick={() => setAddressDialog(false)} aria-label="Đóng"><X size={18} /></button></div>
        <div className="form-grid">
          <label>Người nhận<input required maxLength={200} value={addressForm.receiverName} onChange={(event) => setAddressForm({ ...addressForm, receiverName: event.target.value })} /></label>
          <label>Số điện thoại<input required maxLength={30} value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} /></label>
          <label>Tỉnh / Thành phố<input required maxLength={100} value={addressForm.province} onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })} /></label>
          <label>Quận / Huyện<input required maxLength={100} value={addressForm.district} onChange={(event) => setAddressForm({ ...addressForm, district: event.target.value })} /></label>
          <label>Phường / Xã<input required maxLength={100} value={addressForm.ward} onChange={(event) => setAddressForm({ ...addressForm, ward: event.target.value })} /></label>
          <label className="full-field">Địa chỉ chi tiết<input required maxLength={500} value={addressForm.detailAddress} onChange={(event) => setAddressForm({ ...addressForm, detailAddress: event.target.value })} placeholder="Số nhà, tên đường, tòa nhà..." /></label>
          {!addressEditing ? <label className="check-field full-field"><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} /> Đặt làm địa chỉ mặc định</label> : null}
        </div>
        <div className="dialog-footer"><button type="button" className="secondary-button" onClick={() => setAddressDialog(false)}>Hủy</button><button type="submit" className="primary-button"><MapPin size={16} /> Lưu địa chỉ</button></div>
      </form></div> : null}
    </main>
  );
}
