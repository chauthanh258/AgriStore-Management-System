"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminModal, IconButton, PageHeader, StatusBadge, DataTable } from "../../../components/admin/admin-ui";
import { products as mockProducts, purchaseOrders, suppliers as mockSuppliers } from "../../../data/admin-mock";
import { formatCurrency } from "../../../lib/formatters";
import {
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  orderPurchaseOrder,
  receivePurchaseOrder,
  updatePurchaseOrder
} from "../../../services/purchase-orders/purchase-order.service";
import { getProducts } from "../../../services/products/product.service";
import { createSupplier, getSuppliers, setSupplierStatus, updateSupplier } from "../../../services/suppliers/supplier.service";
import { getWarehouses } from "../../../services/warehouses/warehouse.service";
import type { Product, Supplier, SupplierRequest, Warehouse } from "../../../types/api";
import type { PurchaseOrder, PurchaseOrderLineRequest, PurchaseOrderListItem, PurchaseOrderRequest, ReceivePurchaseOrderRequest } from "../../../types/purchase-orders";
import { statusTone } from "../../../components/admin/resource-page";
import { Check, ChevronLeft, ChevronRight, Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import PurchaseOrderDetailModal, { type UncertainAction } from "./purchase-order-detail";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
const pageSize = 10;
const supplierPageSize = 20;
const orderStatuses = ["Draft", "Ordered", "Received", "Cancelled"];
const emptySupplierForm: SupplierRequest = {
  code: "",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  taxCode: "",
  notes: ""
};

const mockSupplierItems: Supplier[] = mockSuppliers.map((supplier) => ({
  id: supplier.id,
  code: supplier.code,
  name: supplier.name,
  contactPerson: supplier.contactName,
  phone: supplier.phone,
  email: supplier.email,
  address: supplier.address,
  isActive: supplier.isActive
}));

const initialMockPurchaseOrders: PurchaseOrder[] = purchaseOrders.map((order) => ({
  ...order,
  totalAmount: order.details.reduce((total, detail) => total + detail.quantity * detail.unitPrice, 0),
  expectedDate: null,
  notes: null,
  details: order.details.map((detail, index) => {
    const product = mockProducts.find((item) => item.id === detail.productId);
    return {
      id: `${order.id}-detail-${index + 1}`,
      productId: detail.productId,
      productCode: product?.code ?? "",
      productName: detail.productName,
      quantity: detail.quantity,
      unitPrice: detail.unitPrice,
      totalPrice: detail.quantity * detail.unitPrice,
      receivedQuantity: order.status === "Received" ? detail.quantity : detail.receivedQuantity
    };
  })
}));

const mockWarehouses: Warehouse[] = [{
  id: "wh-1",
  name: "Kho lạnh Đà Lạt",
  address: "",
  phone: "",
  isDefault: true,
  isActive: true
}];

type PurchaseOrderFormState = {
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  details: PurchaseOrderFormLine[];
};

type PurchaseOrderFormLine = Omit<PurchaseOrderLineRequest, "unitPrice"> & {
  unitPrice: string;
  productLabel?: string;
};

function getLocalDateInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyPurchaseOrderForm(): PurchaseOrderFormState {
  return {
    supplierId: "",
    warehouseId: "",
    orderDate: getLocalDateInputValue(),
    expectedDate: "",
    notes: "",
    details: [{ productId: "", quantity: 1, unitPrice: "0" }]
  };
}

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toPurchaseOrderForm(order: PurchaseOrder): PurchaseOrderFormState {
  return {
    supplierId: order.supplierId,
    warehouseId: order.warehouseId,
    orderDate: toDateInputValue(order.orderDate),
    expectedDate: toDateInputValue(order.expectedDate),
    notes: order.notes ?? "",
    details: order.details.map((detail) => ({
      productId: detail.productId,
      quantity: detail.quantity,
      unitPrice: String(detail.unitPrice),
      productLabel: `${detail.productCode} — ${detail.productName}`
    }))
  };
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Draft: "Nháp",
    Ordered: "Đã đặt",
    Received: "Đã nhận",
    Cancelled: "Đã hủy"
  };
  return labels[status] ?? status;
}

export default function PurchaseOrdersPage() {
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [mockSupplierItemsState, setMockSupplierItemsState] = useState<Supplier[]>(mockSupplierItems);
  const [mockPurchaseOrders, setMockPurchaseOrders] = useState<PurchaseOrder[]>(initialMockPurchaseOrders);
  const [purchaseOrderSuppliers, setPurchaseOrderSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrderProducts, setPurchaseOrderProducts] = useState<Product[]>([]);
  const [purchaseOrderWarehouses, setPurchaseOrderWarehouses] = useState<Warehouse[]>([]);
  const [supplierPage, setSupplierPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [ordersReloadCount, setOrdersReloadCount] = useState(0);
  const [supplierReloadCount, setSupplierReloadCount] = useState(0);
  const [supplierResult, setSupplierResult] = useState<{
    requestKey: string;
    items: Supplier[];
    totalPages: number;
    error: string;
  } | null>(null);
  const [ordersResult, setOrdersResult] = useState<{
    requestKey: string;
    items: PurchaseOrderListItem[];
    totalPages: number;
    error: string;
  } | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [purchaseOrderModalOpen, setPurchaseOrderModalOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [unresolvedOrders, setUnresolvedOrders] = useState<Record<string, UncertainAction>>({});
  const [purchaseOrderLoading, setPurchaseOrderLoading] = useState(false);
  const [purchaseOrderLoadFailed, setPurchaseOrderLoadFailed] = useState(false);
  const [savingPurchaseOrder, setSavingPurchaseOrder] = useState(false);
  const [purchaseOrderError, setPurchaseOrderError] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPurchaseOrderId, setEditingPurchaseOrderId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierRequest>(emptySupplierForm);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState<PurchaseOrderFormState>(createEmptyPurchaseOrderForm);
  const purchaseOrderLoadRequestId = useRef(0);
  const supplierRequestKey = `${supplierPage}:${supplierReloadCount}`;
  const orderRequestKey = `${page}:${statusFilter}:${ordersReloadCount}`;

  useEffect(() => {
    if (useMock) return;
    let active = true;
    getSuppliers({ page: supplierPage, pageSize: supplierPageSize })
      .then((result) => {
        if (!active) return;
        setSupplierResult({
          requestKey: supplierRequestKey,
          items: result.items,
          totalPages: result.totalPages,
          error: ""
        });
      })
      .catch((loadError: unknown) => {
        if (active) {
          setSupplierResult({
            requestKey: supplierRequestKey,
            items: [],
            totalPages: 0,
            error: loadError instanceof Error ? loadError.message : "Không thể tải nhà cung cấp."
          });
        }
      });

    return () => {
      active = false;
    };
  }, [supplierPage, supplierReloadCount, supplierRequestKey]);

  useEffect(() => {
    if (useMock) return;
    let active = true;
    getPurchaseOrders({ page, pageSize, status: statusFilter || undefined })
      .then((result) => {
        if (!active) return;
        setOrdersResult({
          requestKey: orderRequestKey,
          items: result.items,
          totalPages: result.totalPages,
          error: ""
        });
      })
      .catch((loadError: unknown) => {
        if (active) {
          setOrdersResult({
            requestKey: orderRequestKey,
            items: [],
            totalPages: 0,
            error: loadError instanceof Error ? loadError.message : "Không thể tải danh sách đơn nhập."
          });
        }
      });

    return () => {
      active = false;
    };
  }, [page, statusFilter, ordersReloadCount, orderRequestKey]);

  const filteredMockOrders = mockPurchaseOrders
    .map((order) => ({
      id: order.id,
      code: order.code,
      supplierName: order.supplierName,
      warehouseName: order.warehouseName,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
      status: order.status,
      totalAmount: order.totalAmount
    }))
    .filter((order) => !statusFilter || order.status === statusFilter)
    .sort((left, right) => new Date(right.orderDate).getTime() - new Date(left.orderDate).getTime());
  const startIndex = (page - 1) * pageSize;
  const supplierStartIndex = (supplierPage - 1) * supplierPageSize;
  const supplierItems = useMock
    ? mockSupplierItemsState.slice(supplierStartIndex, supplierStartIndex + supplierPageSize)
    : supplierResult?.requestKey === supplierRequestKey ? supplierResult.items : [];
  const supplierTotalPages = useMock
    ? Math.ceil(mockSupplierItemsState.length / supplierPageSize)
    : supplierResult?.requestKey === supplierRequestKey ? supplierResult.totalPages : 0;
  const purchaseOrderItems = useMock
    ? filteredMockOrders.slice(startIndex, startIndex + pageSize)
    : ordersResult?.requestKey === orderRequestKey ? ordersResult.items : [];
  const totalPages = useMock
    ? Math.ceil(filteredMockOrders.length / pageSize)
    : ordersResult?.requestKey === orderRequestKey ? ordersResult.totalPages : 0;
  const ordersLoading = !useMock && ordersResult?.requestKey !== orderRequestKey;
  const ordersError = !useMock && ordersResult?.requestKey === orderRequestKey
    ? ordersResult.error
    : "";
  const supplierLoading = !useMock && supplierResult?.requestKey !== supplierRequestKey;
  const supplierLoadError = !useMock && supplierResult?.requestKey === supplierRequestKey
    ? supplierResult.error
    : "";

  const loadOrderDetail = useCallback(async (id: string) => {
    if (!useMock) return getPurchaseOrder(id);
    const order = mockPurchaseOrders.find((item) => item.id === id);
    if (!order) throw new Error("Không tìm thấy đơn nhập hàng.");
    return order;
  }, [mockPurchaseOrders]);

  async function markOrder(id: string) {
    if (!useMock) return orderPurchaseOrder(id);
    const order = await loadOrderDetail(id);
    if (order.status !== "Draft" || order.details.length === 0) {
      throw new Error("Chỉ có thể đặt đơn nháp có sản phẩm.");
    }
    const updated = { ...order, status: "Ordered" };
    setMockPurchaseOrders((current) => current.map((item) => item.id === id ? updated : item));
    return updated;
  }

  async function receiveOrder(id: string, request: ReceivePurchaseOrderRequest) {
    if (!useMock) return receivePurchaseOrder(id, request);
    const order = await loadOrderDetail(id);
    if (order.status !== "Ordered") throw new Error("Đơn nhập không còn ở trạng thái có thể nhận hàng.");
    const details = order.details.map((detail) => {
      const line = request.details.find((item) => item.productId === detail.productId);
      if (!line) return detail;
      const received = Math.round((detail.receivedQuantity + line.receivedQuantity) * 1000) / 1000;
      if (line.receivedQuantity <= 0 || received > detail.quantity) {
        throw new Error(`Số lượng nhận của ${detail.productName} không hợp lệ.`);
      }
      return { ...detail, receivedQuantity: received };
    });
    const updated = { ...order, details, status: details.every((detail) => detail.receivedQuantity >= detail.quantity) ? "Received" : "Ordered" };
    setMockPurchaseOrders((current) => current.map((item) => item.id === id ? updated : item));
    return updated;
  }

  function openCreateSupplier() {
    setEditingSupplier(null);
    setForm(emptySupplierForm);
    setSupplierError("");
    setModalOpen(true);
  }

  function openEditSupplier(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      taxCode: supplier.taxCode ?? "",
      notes: supplier.notes ?? ""
    });
    setSupplierError("");
    setModalOpen(true);
  }

  async function saveSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setSupplierError("Mã và tên nhà cung cấp là bắt buộc.");
      return;
    }
    setSavingSupplier(true);
    setSupplierError("");
    try {
      const request: SupplierRequest = {
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        contactPerson: form.contactPerson?.trim(),
        phone: form.phone?.trim(),
        email: form.email?.trim(),
        address: form.address?.trim(),
        taxCode: form.taxCode?.trim(),
        notes: form.notes?.trim()
      };

      if (editingSupplier) {
        if (useMock) {
          const updated = { ...editingSupplier, ...request };
          setMockSupplierItemsState((current) => current.map((supplier) => supplier.id === updated.id ? updated : supplier));
        } else {
          await updateSupplier(editingSupplier.id, request);
          setSupplierReloadCount((current) => current + 1);
        }
      } else {
        if (useMock) {
          const created = { ...request, id: `supplier-${Date.now()}`, isActive: true };
          setMockSupplierItemsState((current) => [...current, created]);
          setSupplierPage(1);
        } else {
          await createSupplier(request);
          setSupplierPage(1);
          setSupplierReloadCount((current) => current + 1);
        }
      }
      setModalOpen(false);
      setForm(emptySupplierForm);
    } catch (saveError: unknown) {
      setSupplierError(saveError instanceof Error ? saveError.message : "Không thể lưu nhà cung cấp.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function toggleSupplierStatus(supplier: Supplier) {
    setSupplierError("");
    try {
      if (useMock) {
        const updated = { ...supplier, isActive: !supplier.isActive };
        setMockSupplierItemsState((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        await setSupplierStatus(supplier.id, !supplier.isActive);
        setSupplierReloadCount((current) => current + 1);
      }
    } catch (statusError: unknown) {
      setSupplierError(statusError instanceof Error ? statusError.message : "Không thể cập nhật trạng thái nhà cung cấp.");
    }
  }

  async function openPurchaseOrderForm(orderId?: string) {
    if (orderId && unresolvedOrders[orderId]) return;
    const requestId = ++purchaseOrderLoadRequestId.current;
    setEditingPurchaseOrderId(orderId ?? null);
    setPurchaseOrderForm(createEmptyPurchaseOrderForm());
    setPurchaseOrderError("");
    setPurchaseOrderLoadFailed(false);
    setPurchaseOrderModalOpen(true);
    setPurchaseOrderLoading(true);

    try {
      let activeSuppliers: Supplier[];
      let activeProducts: Product[];
      let activeWarehouses: Warehouse[];
      let order: PurchaseOrder | null = null;

      if (useMock) {
        activeSuppliers = mockSupplierItemsState.filter((supplier) => supplier.isActive);
        activeProducts = mockProducts.filter((product) => product.isActive);
        activeWarehouses = mockWarehouses.filter((warehouse) => warehouse.isActive);
        order = orderId ? mockPurchaseOrders.find((item) => item.id === orderId) ?? null : null;
      } else {
        const [supplierFirstPage, productFirstPage, warehouseResult, orderResult] = await Promise.all([
          getSuppliers({ page: 1, pageSize: 100, isActive: true }),
          getProducts({ page: 1, pageSize: 100, isActive: true }),
          getWarehouses(),
          orderId ? getPurchaseOrder(orderId) : Promise.resolve(null)
        ]);
        const [supplierRemainingPages, productRemainingPages] = await Promise.all([
          Promise.all(Array.from({ length: Math.max(supplierFirstPage.totalPages - 1, 0) }, (_, index) =>
            getSuppliers({ page: index + 2, pageSize: 100, isActive: true })
          )),
          Promise.all(Array.from({ length: Math.max(productFirstPage.totalPages - 1, 0) }, (_, index) =>
            getProducts({ page: index + 2, pageSize: 100, isActive: true })
          ))
        ]);
        activeSuppliers = [
          ...supplierFirstPage.items,
          ...supplierRemainingPages.flatMap((result) => result.items)
        ];
        activeProducts = [
          ...productFirstPage.items,
          ...productRemainingPages.flatMap((result) => result.items)
        ];
        activeWarehouses = warehouseResult.filter((warehouse) => warehouse.isActive);
        order = orderResult;
      }

      if (requestId !== purchaseOrderLoadRequestId.current) return;
      setPurchaseOrderSuppliers(activeSuppliers);
      setPurchaseOrderProducts(activeProducts);
      setPurchaseOrderWarehouses(activeWarehouses);

      if (orderId && !order) {
        throw new Error("Không tìm thấy đơn nhập hàng cần sửa.");
      }
      if (order && order.status !== "Draft") {
        throw new Error("Chỉ có thể sửa đơn nhập hàng ở trạng thái Nháp.");
      }

      setPurchaseOrderForm(order
        ? toPurchaseOrderForm(order)
        : {
            ...createEmptyPurchaseOrderForm(),
            supplierId: activeSuppliers[0]?.id ?? "",
            warehouseId: activeWarehouses.find((warehouse) => warehouse.isDefault)?.id
              ?? activeWarehouses[0]?.id
              ?? ""
          });
    } catch (loadError: unknown) {
      if (requestId !== purchaseOrderLoadRequestId.current) return;
      setPurchaseOrderLoadFailed(true);
      setPurchaseOrderError(loadError instanceof Error
        ? loadError.message
        : "Không thể tải dữ liệu cho biểu mẫu đơn nhập hàng.");
    } finally {
      if (requestId === purchaseOrderLoadRequestId.current) {
        setPurchaseOrderLoading(false);
      }
    }
  }

  function closePurchaseOrderForm(force = false) {
    if (savingPurchaseOrder && !force) return;
    purchaseOrderLoadRequestId.current += 1;
    setPurchaseOrderModalOpen(false);
    setPurchaseOrderLoading(false);
    setPurchaseOrderLoadFailed(false);
    setEditingPurchaseOrderId(null);
    setPurchaseOrderError("");
  }

  function updatePurchaseOrderLine(
    index: number,
    update: Partial<PurchaseOrderFormLine>
  ) {
    setPurchaseOrderForm((current) => ({
      ...current,
      details: current.details.map((detail, detailIndex) =>
        detailIndex === index ? { ...detail, ...update } : detail
      )
    }));
  }

  async function savePurchaseOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPurchaseOrderError("");

    if (editingPurchaseOrderId && unresolvedOrders[editingPurchaseOrderId]) {
      setPurchaseOrderError("Cần đối soát thao tác trước của đơn này trước khi sửa.");
      return;
    }
    if (purchaseOrderLoading || purchaseOrderLoadFailed) {
      setPurchaseOrderError("Tải dữ liệu biểu mẫu chưa thành công. Vui lòng thử tải lại.");
      return;
    }
    if (!purchaseOrderForm.supplierId || !purchaseOrderForm.warehouseId) {
      setPurchaseOrderError("Vui lòng chọn nhà cung cấp và kho nhận.");
      return;
    }
    if (!purchaseOrderForm.orderDate) {
      setPurchaseOrderError("Vui lòng chọn ngày đặt hàng.");
      return;
    }
    if (purchaseOrderForm.expectedDate && purchaseOrderForm.expectedDate < purchaseOrderForm.orderDate) {
      setPurchaseOrderError("Ngày dự kiến nhận không được trước ngày đặt hàng.");
      return;
    }
    if (purchaseOrderForm.details.length === 0) {
      setPurchaseOrderError("Đơn nhập hàng phải có ít nhất một sản phẩm.");
      return;
    }
    if (purchaseOrderForm.details.some((detail) =>
      !detail.productId || !Number.isFinite(detail.quantity) || detail.quantity <= 0 ||
      !detail.unitPrice.trim() || !Number.isFinite(Number(detail.unitPrice)) || Number(detail.unitPrice) < 0
    )) {
      setPurchaseOrderError("Mỗi sản phẩm cần có lựa chọn hợp lệ, số lượng lớn hơn 0 và đơn giá không âm.");
      return;
    }
    if (purchaseOrderForm.details.some((detail) =>
      !purchaseOrderProducts.some((product) => product.id === detail.productId)
    )) {
      setPurchaseOrderError("Có sản phẩm đã ngừng hoạt động hoặc không còn khả dụng. Hãy xóa dòng đó hoặc chọn sản phẩm khác.");
      return;
    }
    if (new Set(purchaseOrderForm.details.map((detail) => detail.productId)).size !== purchaseOrderForm.details.length) {
      setPurchaseOrderError("Không được chọn trùng sản phẩm trong đơn nhập hàng.");
      return;
    }

    const request: PurchaseOrderRequest = {
      supplierId: purchaseOrderForm.supplierId,
      warehouseId: purchaseOrderForm.warehouseId,
      orderDate: new Date(`${purchaseOrderForm.orderDate}T00:00:00Z`).toISOString(),
      expectedDate: purchaseOrderForm.expectedDate
        ? new Date(`${purchaseOrderForm.expectedDate}T00:00:00Z`).toISOString()
        : undefined,
      notes: purchaseOrderForm.notes.trim() || undefined,
      details: purchaseOrderForm.details.map((detail) => ({
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: Number(detail.unitPrice)
      }))
    };

    setSavingPurchaseOrder(true);
    try {
      if (useMock) {
        const supplier = purchaseOrderSuppliers.find((item) => item.id === request.supplierId);
        const warehouse = purchaseOrderWarehouses.find((item) => item.id === request.warehouseId);
        if (!supplier || !warehouse) {
          throw new Error("Nhà cung cấp hoặc kho nhận không còn khả dụng.");
        }

        const currentOrder = editingPurchaseOrderId
          ? mockPurchaseOrders.find((item) => item.id === editingPurchaseOrderId)
          : undefined;
        if (editingPurchaseOrderId && !currentOrder) {
          throw new Error("Không tìm thấy đơn nhập hàng cần cập nhật.");
        }

        const details = request.details.map((detail, index) => {
          const product = purchaseOrderProducts.find((item) => item.id === detail.productId);
          if (!product) {
            throw new Error("Một sản phẩm đã chọn không còn khả dụng.");
          }
          return {
            id: `${editingPurchaseOrderId ?? "po-local"}-detail-${Date.now()}-${index}`,
            productId: detail.productId,
            productCode: product.code,
            productName: product.name,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            totalPrice: detail.quantity * detail.unitPrice,
            receivedQuantity: 0
          };
        });
        const updatedOrder: PurchaseOrder = {
          id: currentOrder?.id ?? `po-${Date.now()}`,
          code: currentOrder?.code ?? `PO-LOCAL-${Date.now()}`,
          supplierId: supplier.id,
          supplierName: supplier.name,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          orderDate: request.orderDate,
          expectedDate: request.expectedDate ?? null,
          status: "Draft",
          totalAmount: details.reduce((total, detail) => total + detail.totalPrice, 0),
          notes: request.notes ?? null,
          details
        };
        setMockPurchaseOrders((current) => currentOrder
          ? current.map((item) => item.id === updatedOrder.id ? updatedOrder : item)
          : [...current, updatedOrder]);
      } else if (editingPurchaseOrderId) {
        await updatePurchaseOrder(editingPurchaseOrderId, request);
        setOrdersReloadCount((current) => current + 1);
      } else {
        await createPurchaseOrder(request);
        setPage(1);
        setOrdersReloadCount((current) => current + 1);
      }

      closePurchaseOrderForm(true);
    } catch (saveError: unknown) {
      setPurchaseOrderError(saveError instanceof Error
        ? saveError.message
        : "Không thể lưu đơn nhập hàng.");
    } finally {
      setSavingPurchaseOrder(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ CHUỖI CUNG ỨNG › NHÀ CUNG CẤP & ĐƠN NHẬP"
        title="Nhà cung cấp & Đơn nhập hàng"
        description="Theo dõi nhà vườn, đơn nhập và nghiệm thu trước khi cộng tồn kho."
        action={tab === "suppliers"
          ? <button onClick={openCreateSupplier} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white flex items-center gap-1"><Plus className="h-4 w-4" /> Thêm nhà cung cấp</button>
          : <button onClick={() => void openPurchaseOrderForm()} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white flex items-center gap-1"><Plus className="h-4 w-4" /> Tạo đơn nhập hàng</button>}
      />
      <div className="mb-4 flex gap-2 border-b border-[#dfe8dd]">
        <button onClick={() => setTab("orders")} className={`px-4 py-3 text-xs font-bold ${tab === "orders" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}>Đơn nhập hàng</button>
        <button onClick={() => setTab("suppliers")} className={`px-4 py-3 text-xs font-bold ${tab === "suppliers" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}>Nhà cung cấp</button>
      </div>
      {tab === "orders" ? (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#536156]">
              Lọc trạng thái
              <select
                className="rounded-lg border border-[#dfe8dd] bg-white px-3 py-2 text-xs"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                {orderStatuses.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
              </select>
            </label>
            <span className="text-xs text-[#66736a]">{totalPages ? `Trang ${page}/${totalPages}` : "Không có trang dữ liệu"}</span>
          </div>
          {ordersError && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{ordersError}<button className="ml-2 font-bold underline" onClick={() => setOrdersReloadCount((current) => current + 1)}>Thử lại</button></div>}
          {ordersLoading ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Đang tải danh sách đơn nhập...</p>
          ) : purchaseOrderItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Không có đơn nhập phù hợp với trạng thái đã chọn.</p>
          ) : (
            <DataTable headers={["Mã PO / ngày tạo", "Nhà cung cấp", "Kho nhận", "Tổng tiền", "Trạng thái", "Thao tác"]}>
              {purchaseOrderItems.map((order) => <tr className="hover:bg-[#f8fbf7]" key={order.id}>
                <td className="px-3 py-3"><b>{order.code}</b><small className="block text-[10px] text-[#66736a]">{new Date(order.orderDate).toLocaleDateString("vi-VN", { timeZone: "UTC" })}</small></td>
                <td className="px-3 py-3">{order.supplierName}</td>
                <td className="px-3 py-3">{order.warehouseName}</td>
                <td className="px-3 py-3">{formatCurrency(order.totalAmount)}</td>
                <td className="px-3 py-3"><StatusBadge tone={statusTone(order.status)}>{getStatusLabel(order.status)}</StatusBadge></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <IconButton label={`Xem đơn nhập ${order.code}`} onClick={() => setDetailOrderId(order.id)}><Eye className="h-4 w-4" /></IconButton>
                    {order.status === "Draft" && !unresolvedOrders[order.id] && <IconButton label={`Sửa đơn nhập ${order.code}`} onClick={() => void openPurchaseOrderForm(order.id)}><Pencil className="h-4 w-4" /></IconButton>}
                  </div>
                </td>
              </tr>)}
            </DataTable>
          )}
          <div className="mt-4 flex items-center justify-end gap-3 text-xs">
            <button
              className="rounded border border-[#dfe8dd] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={ordersLoading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Trang trước
            </button>
            <button
              className="rounded border border-[#dfe8dd] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={ordersLoading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          {(supplierError || supplierLoadError) && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
            {supplierError || supplierLoadError}
            {supplierLoadError && <button className="ml-2 font-bold underline" onClick={() => setSupplierReloadCount((current) => current + 1)}>Thử lại</button>}
          </div>}
          {supplierLoading ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Đang tải nhà cung cấp...</p>
          ) : supplierItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#66736a]">Chưa có nhà cung cấp nào.</p>
          ) : (
            <DataTable headers={["Mã", "Nhà cung cấp", "Người liên hệ", "Điện thoại", "Trạng thái", "Thao tác"]}>
              {supplierItems.map((supplier) => <tr className="hover:bg-[#f8fbf7]" key={supplier.id}>
                <td className="px-3 py-3 font-semibold">{supplier.code}</td>
                <td className="px-3 py-3">{supplier.name}</td>
                <td className="px-3 py-3">{supplier.contactPerson ?? "—"}</td>
                <td className="px-3 py-3">{supplier.phone ?? "—"}</td>
                <td className="px-3 py-3"><StatusBadge tone={supplier.isActive ? "green" : "gray"}>{supplier.isActive ? "Đang hoạt động" : "Tạm khóa"}</StatusBadge></td>
                <td className="flex gap-2 px-3 py-3">
                  <IconButton label={`Sửa ${supplier.name}`} onClick={() => openEditSupplier(supplier)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label={supplier.isActive ? `Tạm khóa ${supplier.name}` : `Kích hoạt ${supplier.name}`} onClick={() => void toggleSupplierStatus(supplier)}>
                    {supplier.isActive ? <Power className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </IconButton>
                </td>
              </tr>)}
            </DataTable>
          )}
          <div className="mt-4 flex items-center justify-end gap-3 text-xs">
            <span className="text-[#66736a]">{supplierTotalPages ? `Trang ${supplierPage}/${supplierTotalPages}` : "Không có trang dữ liệu"}</span>
            <button
              aria-label="Trang nhà cung cấp trước"
              className="rounded border border-[#dfe8dd] p-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={supplierLoading || supplierPage <= 1}
              onClick={() => setSupplierPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Trang nhà cung cấp sau"
              className="rounded border border-[#dfe8dd] p-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={supplierLoading || supplierPage >= supplierTotalPages}
              onClick={() => setSupplierPage((current) => current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {detailOrderId && <PurchaseOrderDetailModal
        key={detailOrderId}
        orderId={detailOrderId}
        mock={useMock}
        loadOrder={loadOrderDetail}
        markOrdered={markOrder}
        receiveOrder={receiveOrder}
        onChanged={() => { setPage(1); setOrdersReloadCount((current) => current + 1); }}
        unresolved={unresolvedOrders[detailOrderId]}
        onUncertain={(action) => setUnresolvedOrders((current) => ({ ...current, [detailOrderId]: action }))}
        onReconciled={() => setUnresolvedOrders((current) => {
          const next = { ...current };
          delete next[detailOrderId];
          return next;
        })}
        onClose={() => setDetailOrderId(null)}
      />}
      {modalOpen && <AdminModal title={editingSupplier ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp"} description="Thông tin nhà vườn/hợp tác xã dùng cho đơn nhập hàng." onClose={() => setModalOpen(false)} footer={<><button className="rounded-lg border px-4 py-2 text-xs" onClick={() => setModalOpen(false)}>Hủy</button><button form="supplier-form" disabled={savingSupplier} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{savingSupplier ? "Đang lưu..." : "Lưu nhà cung cấp"}</button></>}>
        {supplierError && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">{supplierError}</div>}
        <form id="supplier-form" onSubmit={(event) => void saveSupplier(event)} className="grid gap-4 sm:grid-cols-2 text-xs">
          <label>Mã NCC<input required maxLength={50} className="mt-1 w-full rounded-lg border p-3" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
          <label>Tên nhà cung cấp<input required maxLength={200} className="mt-1 w-full rounded-lg border p-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Người liên hệ<input maxLength={200} className="mt-1 w-full rounded-lg border p-3" value={form.contactPerson ?? ""} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></label>
          <label>Số điện thoại<input maxLength={50} className="mt-1 w-full rounded-lg border p-3" value={form.phone ?? ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Email<input type="email" maxLength={256} className="mt-1 w-full rounded-lg border p-3" value={form.email ?? ""} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Mã số thuế<input maxLength={50} className="mt-1 w-full rounded-lg border p-3" value={form.taxCode ?? ""} onChange={(event) => setForm({ ...form, taxCode: event.target.value })} /></label>
          <label className="sm:col-span-2">Địa chỉ<input maxLength={1000} className="mt-1 w-full rounded-lg border p-3" value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <label className="sm:col-span-2">Ghi chú<textarea maxLength={2000} className="mt-1 w-full rounded-lg border p-3" rows={3} value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        </form>
      </AdminModal>}
      {purchaseOrderModalOpen && <AdminModal
        title={editingPurchaseOrderId ? "Sửa đơn nhập hàng" : "Tạo đơn nhập hàng"}
        description="Đơn nháp có thể chỉnh sửa trước khi xác nhận đặt hàng."
        onClose={() => closePurchaseOrderForm()}
        footer={<>
          <button type="button" disabled={savingPurchaseOrder} className="rounded-lg border px-4 py-2 text-xs disabled:opacity-50" onClick={() => closePurchaseOrderForm()}>Hủy</button>
          <button
            type="submit"
            form="purchase-order-form"
            disabled={purchaseOrderLoading || purchaseOrderLoadFailed || savingPurchaseOrder}
            className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {savingPurchaseOrder ? "Đang lưu..." : "Lưu đơn nháp"}
          </button>
        </>}
      >
        {purchaseOrderError && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
          {purchaseOrderError}
          {purchaseOrderLoadFailed && !purchaseOrderLoading &&
            <button type="button" className="ml-2 font-bold underline" onClick={() => void openPurchaseOrderForm(editingPurchaseOrderId ?? undefined)}>Thử tải lại</button>}
        </div>}
        {purchaseOrderLoading ? (
          <p className="py-10 text-center text-sm text-[#66736a]">Đang tải nhà cung cấp, sản phẩm và kho...</p>
        ) : purchaseOrderLoadFailed ? (
          <p className="py-6 text-center text-sm text-[#66736a]">Chưa thể mở biểu mẫu. Vui lòng tải lại dữ liệu.</p>
        ) : (
          <form id="purchase-order-form" onSubmit={(event) => void savePurchaseOrder(event)}>
            <fieldset disabled={savingPurchaseOrder} className="min-w-0 space-y-5 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="font-semibold text-[#536156]">Nhà cung cấp
                <select required className="mt-1 w-full rounded-lg border p-3 font-normal" value={purchaseOrderForm.supplierId} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, supplierId: event.target.value }))}>
                  <option value="">Chọn nhà cung cấp</option>
                  {purchaseOrderSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.code} — {supplier.name}</option>)}
                </select>
              </label>
              <label className="font-semibold text-[#536156]">Kho nhận
                <select required className="mt-1 w-full rounded-lg border p-3 font-normal" value={purchaseOrderForm.warehouseId} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, warehouseId: event.target.value }))}>
                  <option value="">Chọn kho nhận</option>
                  {purchaseOrderWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </select>
              </label>
              <label className="font-semibold text-[#536156]">Ngày đặt
                <input required type="date" className="mt-1 w-full rounded-lg border p-3 font-normal" value={purchaseOrderForm.orderDate} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, orderDate: event.target.value }))} />
              </label>
              <label className="font-semibold text-[#536156]">Ngày dự kiến nhận
                <input type="date" min={purchaseOrderForm.orderDate} className="mt-1 w-full rounded-lg border p-3 font-normal" value={purchaseOrderForm.expectedDate} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, expectedDate: event.target.value }))} />
              </label>
            </div>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-[#1c2a20]">Sản phẩm nhập</h3>
                <button
                  type="button"
                  disabled={purchaseOrderProducts.length === 0}
                  onClick={() => setPurchaseOrderForm((current) => ({
                    ...current,
                    details: [...current.details, { productId: "", quantity: 1, unitPrice: "0" }]
                  }))}
                  className="flex items-center gap-1 rounded-lg border border-[#dfe8dd] px-3 py-2 font-semibold text-[#006948] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Thêm sản phẩm
                </button>
              </div>
              {purchaseOrderProducts.length === 0 && purchaseOrderForm.details.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Không có sản phẩm đang hoạt động để thêm vào đơn.</p>
              ) : (
                <div className="space-y-3">
                  {purchaseOrderForm.details.map((detail, index) => {
                    const selectedProduct = purchaseOrderProducts.find((product) => product.id === detail.productId);
                    const productUnavailable = Boolean(detail.productId && !selectedProduct);
                    const lineTotal = detail.quantity * Number(detail.unitPrice);
                    return <div key={`po-line-${index}`} className="grid gap-3 rounded-xl border border-[#e7eee4] bg-[#fbfdf9] p-3 sm:grid-cols-12 sm:items-end">
                      <label className="font-semibold text-[#536156] sm:col-span-5">Sản phẩm
                        <select
                          required
                          className="mt-1 w-full rounded-lg border bg-white p-3 font-normal"
                          value={detail.productId}
                          onChange={(event) => {
                            const product = purchaseOrderProducts.find((item) => item.id === event.target.value);
                            updatePurchaseOrderLine(index, {
                              productId: event.target.value,
                              unitPrice: String(product?.costPrice ?? 0),
                              productLabel: product ? `${product.code} — ${product.name}` : undefined
                            });
                          }}
                        >
                          <option value="">Chọn sản phẩm</option>
                          {productUnavailable && <option value={detail.productId}>{detail.productLabel ?? "Sản phẩm không còn hoạt động"} (không khả dụng)</option>}
                          {purchaseOrderProducts.map((product) => {
                            const usedInAnotherLine = purchaseOrderForm.details.some((line, lineIndex) =>
                              lineIndex !== index && line.productId === product.id
                            );
                            return <option key={product.id} value={product.id} disabled={usedInAnotherLine}>
                              {product.code} — {product.name} ({product.unitName})
                            </option>;
                          })}
                        </select>
                        {productUnavailable && <span className="mt-1 block font-normal text-amber-700">Sản phẩm không còn hoạt động; hãy xóa dòng hoặc chọn sản phẩm khác.</span>}
                      </label>
                      <label className="font-semibold text-[#536156] sm:col-span-2">Số lượng
                        <input
                          required
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="mt-1 w-full rounded-lg border bg-white p-3 font-normal"
                          value={detail.quantity}
                          onChange={(event) => updatePurchaseOrderLine(index, { quantity: Number(event.target.value) })}
                        />
                      </label>
                      <label className="font-semibold text-[#536156] sm:col-span-2">Đơn giá
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          className="mt-1 w-full rounded-lg border bg-white p-3 font-normal"
                          value={detail.unitPrice}
                          onChange={(event) => updatePurchaseOrderLine(index, { unitPrice: event.target.value })}
                        />
                      </label>
                      <div className="sm:col-span-2">
                        <span className="block font-semibold text-[#536156]">Thành tiền</span>
                        <span className="mt-1 block rounded-lg bg-white p-3 font-bold">{formatCurrency(Number.isFinite(lineTotal) ? lineTotal : 0)}</span>
                      </div>
                      <div className="flex justify-end sm:col-span-1">
                        <IconButton label={`Xóa dòng sản phẩm ${selectedProduct?.name ?? index + 1}`} tone="danger" onClick={() => setPurchaseOrderForm((current) => ({
                          ...current,
                          details: current.details.filter((_, detailIndex) => detailIndex !== index)
                        }))}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </div>;
                  })}
                </div>
              )}
              <div className="flex justify-end border-t border-[#e7eee4] pt-3 text-sm font-bold">
                Tổng đơn: {formatCurrency(purchaseOrderForm.details.reduce(
                  (total, detail) => total + detail.quantity * Number(detail.unitPrice),
                  0
                ))}
              </div>
            </section>

            <label className="block font-semibold text-[#536156]">Ghi chú
              <textarea maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border p-3 font-normal" value={purchaseOrderForm.notes} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            </fieldset>
          </form>
        )}
      </AdminModal>}
    </>
  );
}
