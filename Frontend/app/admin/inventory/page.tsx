"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  Plus,
  Search,
  Trash2
} from "lucide-react";
import {
  AdminModal,
  KpiGrid,
  PageHeader,
  Panel,
  StatusBadge
} from "../../../components/admin/admin-ui";
import {
  createStockTransfer,
  getInventories,
  getLowStock
} from "../../../services/inventory/inventory.service";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouseById,
  getWarehouses,
  updateWarehouse
} from "../../../services/warehouses/warehouse.service";
import StockTransactionsPanel from "./stock-transactions-panel";
import type {
  CreateWarehouseRequest,
  InventoryItem,
  PaginatedResponse,
  ProblemDetails,
  StockTransferRequest,
  UpdateWarehouseRequest,
  Warehouse
} from "../../../types/api";

const pageSize = 20;

interface TransferLine {
  productId: string;
  productCode: string;
  productName: string;
  availableQuantity: number;
  quantity: string;
}

interface InventoryRequestState {
  requestKey: string;
  result?: PaginatedResponse<InventoryItem>;
  error?: string;
}

interface TransferLookupState {
  requestKey: string;
  candidates: InventoryItem[];
  error?: string;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ProblemDetails>(error)) {
    const status = error.response?.status;
    if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Tài khoản không có quyền quản lý kho (ManageOperations).";

    const data = error.response?.data;
    const validationErrors = Object.values(data?.errors ?? {})
      .flat()
      .filter(Boolean);
    if (validationErrors.length > 0) return validationErrors.join(" ");
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
    if (!error.response) return "Không thể kết nối máy chủ. Hãy kiểm tra API và thử lại.";
    return fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "transactions">("inventory");
  const [allWarehouses, setAllWarehouses] = useState<Warehouse[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesReady, setWarehousesReady] = useState(false);
  const [warehousesLoadFailed, setWarehousesLoadFailed] = useState(false);
  const [warehouseError, setWarehouseError] = useState("");
  const [warehouseReloadCount, setWarehouseReloadCount] = useState(0);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [inventoryRequestState, setInventoryRequestState] = useState<InventoryRequestState | null>(null);
  const [inventoryReloadCount, setInventoryReloadCount] = useState(0);
  const [transactionReloadCount, setTransactionReloadCount] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState("");

  const [createWarehouseModalOpen, setCreateWarehouseModalOpen] = useState(false);
  const [createWarehouseForm, setCreateWarehouseForm] = useState<CreateWarehouseRequest>({
    name: "",
    address: "",
    phone: "",
    isDefault: false
  });
  const [createWarehouseError, setCreateWarehouseError] = useState("");
  const [createWarehouseSaving, setCreateWarehouseSaving] = useState(false);
  const [warehouseActionBusy, setWarehouseActionBusy] = useState(false);
  const [warehouseActionError, setWarehouseActionError] = useState("");
  const [editWarehouseTarget, setEditWarehouseTarget] = useState<Warehouse | null>(null);
  const [editWarehouseForm, setEditWarehouseForm] = useState<UpdateWarehouseRequest>({
    name: "",
    address: null,
    phone: null,
    isDefault: false,
    isActive: true
  });
  const [editWarehouseError, setEditWarehouseError] = useState("");
  const [deleteWarehouseTarget, setDeleteWarehouseTarget] = useState<Warehouse | null>(null);
  const [deleteWarehouseError, setDeleteWarehouseError] = useState("");

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceWarehouseId, setTransferSourceWarehouseId] = useState("");
  const [transferDestinationWarehouseId, setTransferDestinationWarehouseId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferLines, setTransferLines] = useState<TransferLine[]>([]);
  const [transferSearchText, setTransferSearchText] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [transferLookupState, setTransferLookupState] = useState<TransferLookupState | null>(null);
  const [candidateProductId, setCandidateProductId] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const transferIdRef = useRef<string | null>(null);
  const warehouseActionLockRef = useRef(false);

  const inventoryRequestKey = `${page}:${selectedWarehouseId}:${search}:${lowStockOnly}:${inventoryReloadCount}`;
  const currentInventoryRequest = inventoryRequestState?.requestKey === inventoryRequestKey
    ? inventoryRequestState
    : null;
  const inventoryResult = currentInventoryRequest?.result ?? null;
  const loadError = currentInventoryRequest?.error ?? "";
  const loading = !warehousesLoadFailed &&
    (!warehousesReady || currentInventoryRequest === null);
  const transferLookupRequestKey = `${transferModalOpen}:${transferSourceWarehouseId}:${transferSearch}:${inventoryReloadCount}`;
  const currentTransferLookup = transferLookupState?.requestKey === transferLookupRequestKey
    ? transferLookupState
    : null;
  const transferCandidates = currentTransferLookup?.candidates ?? [];
  const transferLookupError = currentTransferLookup?.error ?? "";
  const transferProductsLoading = transferModalOpen &&
    Boolean(transferSourceWarehouseId) &&
    currentTransferLookup === null;

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchText.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTransferSearch(transferSearchText.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [transferSearchText]);

  useEffect(() => {
    let active = true;
    getWarehouses()
      .then((result) => {
        if (!active) return;
        setWarehousesLoadFailed(false);
        setWarehouseError("");
        setAllWarehouses(result);
        const activeWarehouses = result.filter((warehouse) => warehouse.isActive);
        setWarehouses(activeWarehouses);
        setSelectedWarehouseId((current) =>
          activeWarehouses.some((warehouse) => warehouse.id === current)
            ? current
            : activeWarehouses.find((warehouse) => warehouse.isDefault)?.id ?? ""
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setWarehousesLoadFailed(true);
          setWarehouseError(getApiErrorMessage(error, "Không thể tải danh sách kho."));
        }
      })
      .finally(() => {
        if (active) setWarehousesReady(true);
      });

    return () => {
      active = false;
    };
  }, [warehouseReloadCount]);

  useEffect(() => {
    if (!warehousesReady || warehousesLoadFailed) return;
    let active = true;

    const params = {
      warehouseId: selectedWarehouseId || undefined,
      search: search || undefined,
      page,
      pageSize
    };
    const inventoryRequest = lowStockOnly
      ? getLowStock(params)
      : getInventories(params);

    inventoryRequest
      .then((result) => {
        if (!active) return;
        setInventoryRequestState({ requestKey: inventoryRequestKey, result });
      })
      .catch((error: unknown) => {
        if (active) {
          setInventoryRequestState({
            requestKey: inventoryRequestKey,
            error: getApiErrorMessage(error, "Không thể tải tồn kho.")
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    warehousesReady,
    warehousesLoadFailed,
    selectedWarehouseId,
    search,
    lowStockOnly,
    page,
    inventoryReloadCount,
    inventoryRequestKey
  ]);

  const visibleItems = inventoryResult?.items ?? [];
  const totalCount = inventoryResult?.totalCount ?? 0;
  const totalPages = Math.max(1, inventoryResult?.totalPages ?? 0);
  const pageQuantity = visibleItems.reduce((sum, item) => sum + item.quantity, 0);
  const pageAvailableQuantity = visibleItems.reduce((sum, item) => sum + item.availableQuantity, 0);
  const lowStockItems = visibleItems.filter((item) => item.isLowStock);
  const visibleLowStockCount = lowStockItems.length;

  useEffect(() => {
    if (!transferModalOpen || !transferSourceWarehouseId) return;
    let active = true;
    const requestKey = transferLookupRequestKey;
    const timeout = window.setTimeout(() => {
      const request = getInventories({
        warehouseId: transferSourceWarehouseId,
        search: transferSearch || undefined,
        page: 1,
        pageSize: 20
      }).then((result) => result.items);

      request
        .then((items) => {
          if (!active) return;
          const availableItems = items.filter((item) => item.availableQuantity >= 0.001);
          setTransferLookupState({ requestKey, candidates: availableItems });
          setCandidateProductId((current) =>
            availableItems.some((item) => item.productId === current)
              ? current
              : availableItems[0]?.productId ?? ""
          );
        })
        .catch((error: unknown) => {
          if (active) {
            setTransferLookupState({
              requestKey,
              candidates: [],
              error: getApiErrorMessage(error, "Không thể tải sản phẩm ở kho nguồn.")
            });
            setCandidateProductId("");
          }
        });
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [
    transferModalOpen,
    transferSourceWarehouseId,
    transferSearch,
    inventoryReloadCount,
    transferLookupRequestKey
  ]);

  const reloadData = useCallback(() => {
    setInventoryReloadCount((current) => current + 1);
    setTransactionReloadCount((current) => current + 1);
    setTransactionPage(1);
    setWarehouseReloadCount((current) => current + 1);
  }, []);

  const reloadStockData = useCallback(() => {
    setInventoryReloadCount((current) => current + 1);
    setTransactionReloadCount((current) => current + 1);
    setTransactionPage(1);
  }, []);

  function openCreateWarehouseModal() {
    setCreateWarehouseForm({ name: "", address: "", phone: "", isDefault: false });
    setCreateWarehouseError("");
    setSuccessMessage("");
    setCreateWarehouseModalOpen(true);
  }

  function closeCreateWarehouseModal() {
    if (createWarehouseSaving) return;
    setCreateWarehouseModalOpen(false);
    setCreateWarehouseError("");
  }

  async function submitCreateWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateWarehouseError("");

    const name = createWarehouseForm.name.trim();
    if (!name) {
      setCreateWarehouseError("Tên kho không được để trống.");
      return;
    }

    setCreateWarehouseSaving(true);
    try {
      const created = await createWarehouse({
        name,
        address: createWarehouseForm.address?.trim() || null,
        phone: createWarehouseForm.phone?.trim() || null,
        isDefault: createWarehouseForm.isDefault
      });
      setCreateWarehouseModalOpen(false);
      setCreateWarehouseForm({ name: "", address: "", phone: "", isDefault: false });
      setSelectedWarehouseId(created.id);
      setSuccessMessage(`Đã tạo kho "${created.name}" thành công.`);
      setInventoryReloadCount((current) => current + 1);
      setWarehouseReloadCount((current) => current + 1);
    } catch (error: unknown) {
      setCreateWarehouseError(getApiErrorMessage(error, "Không thể tạo kho. Hãy kiểm tra thông tin và thử lại."));
    } finally {
      setCreateWarehouseSaving(false);
    }
  }

  function beginWarehouseAction() {
    if (warehouseActionLockRef.current) return false;
    warehouseActionLockRef.current = true;
    setWarehouseActionBusy(true);
    return true;
  }

  function endWarehouseAction() {
    warehouseActionLockRef.current = false;
    setWarehouseActionBusy(false);
  }

  function applyWarehouseUpdate(id: string, request: UpdateWarehouseRequest) {
    const updatedWarehouse: Warehouse = { id, ...request };
    setAllWarehouses((current) =>
      current.map((warehouse) => {
        if (warehouse.id === id) return updatedWarehouse;
        return request.isDefault ? { ...warehouse, isDefault: false } : warehouse;
      })
    );
    setWarehouses((current) => {
      const updated = current.map((warehouse) => {
        if (warehouse.id === id) return updatedWarehouse;
        return request.isDefault ? { ...warehouse, isDefault: false } : warehouse;
      });
      if (!request.isActive) return updated.filter((warehouse) => warehouse.id !== id);
      return current.some((warehouse) => warehouse.id === id) ? updated : [...updated, updatedWarehouse];
    });

    if (!request.isActive) {
      const replacementId = warehouses.find((warehouse) => warehouse.id !== id && warehouse.isDefault)?.id
        ?? warehouses.find((warehouse) => warehouse.id !== id)?.id
        ?? "";
      setSelectedWarehouseId((current) => current === id ? replacementId : current);
    }
  }

  function openEditWarehouseModal(warehouse: Warehouse) {
    setEditWarehouseTarget(warehouse);
    setEditWarehouseForm({
      name: warehouse.name,
      address: warehouse.address,
      phone: warehouse.phone,
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive
    });
    setEditWarehouseError("");
    setWarehouseActionError("");
    setSuccessMessage("");
  }

  function closeEditWarehouseModal() {
    if (warehouseActionBusy) return;
    setEditWarehouseTarget(null);
    setEditWarehouseError("");
  }

  async function submitEditWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditWarehouseError("");
    if (!editWarehouseTarget) return;

    const name = editWarehouseForm.name.trim();
    if (!name) {
      setEditWarehouseError("Tên kho không được để trống.");
      return;
    }
    if (!beginWarehouseAction()) return;

    const request: UpdateWarehouseRequest = {
      name,
      address: editWarehouseForm.address?.trim() || null,
      phone: editWarehouseForm.phone?.trim() || null,
      isDefault: editWarehouseForm.isDefault,
      isActive: editWarehouseForm.isActive
    };

    try {
      await updateWarehouse(editWarehouseTarget.id, request);
      applyWarehouseUpdate(editWarehouseTarget.id, request);
      setEditWarehouseTarget(null);
      setSuccessMessage(`Đã cập nhật kho "${name}" thành công.`);
      reloadData();
    } catch (error: unknown) {
      setEditWarehouseError(getApiErrorMessage(error, "Không thể cập nhật kho. Hãy kiểm tra thông tin và thử lại."));
    } finally {
      endWarehouseAction();
    }
  }

  async function toggleWarehouseActive(warehouse: Warehouse, isActive: boolean) {
    setWarehouseActionError("");
    setSuccessMessage("");
    if (!beginWarehouseAction()) return;

    try {
      const latestWarehouse = await getWarehouseById(warehouse.id);
      const request: UpdateWarehouseRequest = {
        name: latestWarehouse.name,
        address: latestWarehouse.address,
        phone: latestWarehouse.phone,
        isDefault: latestWarehouse.isDefault,
        isActive
      };
      await updateWarehouse(warehouse.id, request);
      applyWarehouseUpdate(warehouse.id, request);
      setSuccessMessage(`Đã ${request.isActive ? "tiếp tục" : "dừng"} hoạt động kho "${request.name}".`);
      reloadData();
    } catch (error: unknown) {
      setWarehouseActionError(getApiErrorMessage(error, "Không thể thay đổi trạng thái kho."));
    } finally {
      endWarehouseAction();
    }
  }

  function openDeleteWarehouseConfirmation(warehouse: Warehouse) {
    setDeleteWarehouseTarget(warehouse);
    setDeleteWarehouseError("");
    setWarehouseActionError("");
    setSuccessMessage("");
  }

  function closeDeleteWarehouseConfirmation() {
    if (warehouseActionBusy) return;
    setDeleteWarehouseTarget(null);
    setDeleteWarehouseError("");
  }

  async function confirmDeleteWarehouse() {
    if (!deleteWarehouseTarget || !beginWarehouseAction()) return;
    setDeleteWarehouseError("");

    try {
      await deleteWarehouse(deleteWarehouseTarget.id);
      const deletedId = deleteWarehouseTarget.id;
      setAllWarehouses((current) => current.filter((warehouse) => warehouse.id !== deletedId));
      setWarehouses((current) => current.filter((warehouse) => warehouse.id !== deletedId));
      if (selectedWarehouseId === deletedId) {
        const replacementId = warehouses.find((warehouse) => warehouse.id !== deletedId && warehouse.isDefault)?.id
          ?? warehouses.find((warehouse) => warehouse.id !== deletedId)?.id
          ?? "";
        setSelectedWarehouseId(replacementId);
      }
      setDeleteWarehouseTarget(null);
      setSuccessMessage(`Đã xóa kho "${deleteWarehouseTarget.name}" thành công.`);
      reloadData();
    } catch (error: unknown) {
      setDeleteWarehouseError(getApiErrorMessage(error, "Không thể xóa kho."));
    } finally {
      endWarehouseAction();
    }
  }

  function openTransferModal() {
    const sourceWarehouseId = warehouses.some((warehouse) => warehouse.id === selectedWarehouseId)
      ? selectedWarehouseId
      : warehouses.find((warehouse) => warehouse.isDefault)?.id ?? warehouses[0]?.id ?? "";
    const destinationWarehouseId = warehouses.find((warehouse) => warehouse.id !== sourceWarehouseId)?.id ?? "";
    setTransferSourceWarehouseId(sourceWarehouseId);
    setTransferDestinationWarehouseId(destinationWarehouseId);
    setTransferNotes("");
    setTransferLines([]);
    setTransferSearchText("");
    setTransferSearch("");
    setTransferError("");
    setSuccessMessage("");
    transferIdRef.current = null;
    setTransferModalOpen(true);
  }

  function closeTransferModal() {
    if (transferSaving) return;
    setTransferModalOpen(false);
    setTransferLines([]);
    setTransferError("");
    transferIdRef.current = null;
  }

  function addTransferLine() {
    const product = transferCandidates.find((item) => item.productId === candidateProductId);
    if (!product) {
      setTransferError("Hãy chọn sản phẩm còn tồn khả dụng tại kho nguồn.");
      return;
    }
    if (transferLines.some((line) => line.productId === product.productId)) {
      setTransferError("Sản phẩm này đã có trong phiếu chuyển kho.");
      return;
    }

    setTransferLines((current) => [...current, {
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      availableQuantity: product.availableQuantity,
      quantity: String(Math.min(1, product.availableQuantity))
    }]);
    setTransferError("");
    transferIdRef.current = null;
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTransferError("");
    if (!transferSourceWarehouseId || !transferDestinationWarehouseId) {
      setTransferError("Hãy chọn kho nguồn và kho đích đang hoạt động.");
      return;
    }
    if (transferSourceWarehouseId === transferDestinationWarehouseId) {
      setTransferError("Kho nguồn và kho đích phải khác nhau.");
      return;
    }
    if (transferLines.length === 0) {
      setTransferError("Hãy thêm ít nhất một sản phẩm vào phiếu chuyển kho.");
      return;
    }

    const lines: StockTransferRequest["lines"] = [];
    for (const line of transferLines) {
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setTransferError(`Số lượng của ${line.productName} phải lớn hơn 0.`);
        return;
      }
      if (line.quantity.includes(".") && line.quantity.split(".")[1].length > 3) {
        setTransferError(`Số lượng của ${line.productName} chỉ được có tối đa 3 chữ số thập phân.`);
        return;
      }
      if (quantity > line.availableQuantity) {
        setTransferError(`${line.productName} chỉ còn khả dụng ${formatQuantity(line.availableQuantity)}.`);
        return;
      }
      lines.push({ productId: line.productId, quantity });
    }

    if (!transferIdRef.current) transferIdRef.current = crypto.randomUUID();
    const request: StockTransferRequest = {
      transferId: transferIdRef.current,
      sourceWarehouseId: transferSourceWarehouseId,
      destinationWarehouseId: transferDestinationWarehouseId,
      notes: transferNotes.trim() || undefined,
      lines
    };

    setTransferSaving(true);
    try {
      await createStockTransfer(request);
      const sourceName = warehouses.find((warehouse) => warehouse.id === transferSourceWarehouseId)?.name ?? "kho nguồn";
      const destinationName = warehouses.find((warehouse) => warehouse.id === transferDestinationWarehouseId)?.name ?? "kho đích";
      setSuccessMessage(`Đã chuyển hàng thành công từ ${sourceName} đến ${destinationName}. Tồn kho và lịch sử giao dịch đã được tải lại.`);
      setTransferModalOpen(false);
      setTransferLines([]);
      transferIdRef.current = null;
      reloadStockData();
    } catch (error: unknown) {
      setTransferError(getApiErrorMessage(error, "Không thể chuyển kho. Hãy kiểm tra thông tin và thử lại."));
    } finally {
      setTransferSaving(false);
    }
  }

  const transferDisabled = !warehousesReady || warehousesLoadFailed || warehouses.length < 2;

  return (
    <>
      {warehouseError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
          <span>{warehouseError}</span>
          <button type="button" onClick={reloadData} className="font-bold underline">Thử tải lại kho</button>
        </div>
      )}
      {activeTab === "inventory" && loadError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
          <span>{loadError}</span>
          <button type="button" onClick={reloadData} className="font-bold underline">Thử lại</button>
        </div>
      )}
      {successMessage && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-xs text-green-800">
          {successMessage}
        </div>
      )}
      <PageHeader
        eyebrow="QUẢN LÝ CHUỖI CUNG ỨNG　›　KHO & KIỂM KÊ TỒN"
        title={activeTab === "inventory" ? "Kiểm Kê & Quản Trị Tồn Kho Nông Sản" : "Quản Lý Giao Dịch Kho"}
        description={activeTab === "inventory"
          ? "Theo dõi số lượng thực tế, lượng giữ chỗ và tồn khả dụng theo từng kho."
          : "Tra cứu lịch sử và lập phiếu giao dịch kho theo từng kho, sản phẩm."}
        action={activeTab === "inventory" ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={openCreateWarehouseModal}
              className="flex items-center gap-2 rounded-lg border border-[#006948] px-4 py-2 text-xs font-bold text-[#006948] hover:bg-[#eff7ed]"
            >
              <Plus className="h-4 w-4" /> Thêm kho
            </button>
            <button
              type="button"
              onClick={openTransferModal}
              disabled={transferDisabled}
              title={warehouses.length < 2 ? "Cần ít nhất hai kho đang hoạt động." : undefined}
              className="flex items-center gap-2 rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeftRight className="h-4 w-4" /> Chuyển kho
            </button>
            {warehousesReady && !warehousesLoadFailed && warehouses.length < 2 && (
              <small className="w-full text-right text-[10px] text-[#66736a]">
                Cần ít nhất hai kho đang hoạt động.
              </small>
            )}
          </div>
        ) : undefined}
      />

      <div role="tablist" aria-label="Nội dung quản lý kho" className="mb-4 flex gap-2 border-b border-[#dfe8dd]">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "inventory"}
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-3 text-xs font-bold ${activeTab === "inventory" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}
        >
          Tồn kho
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "transactions"}
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-3 text-xs font-bold ${activeTab === "transactions" ? "border-b-2 border-[#006948] text-[#006948]" : "text-[#66736a]"}`}
        >
          Giao dịch kho
        </button>
      </div>

      {activeTab === "inventory" ? (
      <>
      <Panel title="Danh sách kho">
        <p className="mb-4 text-xs text-[#66736a]">
          Quản lý kho đang hoạt động và ngừng hoạt động. Chỉ kho đang hoạt động xuất hiện trong các lựa chọn nghiệp vụ.
        </p>
        {warehouseActionError && (
          <div role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {warehouseActionError}
          </div>
        )}
        {allWarehouses.length === 0 ? (
          <p className="rounded-lg bg-[#f7faf5] px-4 py-6 text-center text-xs text-[#66736a]">
            {warehousesReady ? "Chưa có kho nào." : "Đang tải danh sách kho..."}
          </p>
        ) : (
          <div className="divide-y divide-[#e7eee4]">
            {allWarehouses.map((warehouse) => (
              <div key={warehouse.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">{warehouse.name}</b>
                    <StatusBadge tone={warehouse.isActive ? "green" : "gray"}>
                      {warehouse.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </StatusBadge>
                    {warehouse.isDefault && <StatusBadge tone="blue">Kho mặc định</StatusBadge>}
                  </div>
                  <small className="mt-1 block break-all text-[10px] text-[#66736a]">
                    Mã kho: {warehouse.id}
                    {warehouse.address ? ` · ${warehouse.address}` : ""}
                    {warehouse.phone ? ` · ${warehouse.phone}` : ""}
                  </small>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditWarehouseModal(warehouse)}
                    disabled={warehouseActionBusy}
                    className="flex items-center gap-1 rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs font-semibold text-[#006948] disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleWarehouseActive(warehouse, !warehouse.isActive)}
                    disabled={warehouseActionBusy}
                    className="flex items-center gap-1 rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs font-semibold text-[#425247] disabled:opacity-50"
                  >
                    <Power className="h-3.5 w-3.5" />
                    {warehouse.isActive ? "Dừng hoạt động" : "Tiếp tục hoạt động"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteWarehouseConfirmation(warehouse)}
                    disabled={warehouseActionBusy}
                    className="flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <KpiGrid
        items={[
          {
            label: "Dòng tồn kho phù hợp",
            value: `${totalCount} dòng`,
            hint: "Theo bộ lọc hiện tại"
          },
          {
            label: "Cảnh báo tồn thấp",
            value: `${visibleLowStockCount} dòng`,
            hint: "Trong trang hiện tại",
            tone: "amber"
          },
          {
            label: "Tổng tồn trên trang",
            value: `${formatQuantity(pageQuantity)}`,
            hint: "Số lượng vật lý"
          },
          {
            label: "Khả dụng trên trang",
            value: `${formatQuantity(pageAvailableQuantity)}`,
            hint: "Đã trừ số lượng giữ chỗ",
            tone: "blue"
          }
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_.8fr]">
        <Panel title="Danh Sách Tồn Kho Chi Tiết">
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(160px,.7fr)_minmax(220px,1.3fr)_auto]">
            <label className="sr-only" htmlFor="inventory-warehouse">Lọc theo kho</label>
            <select
              id="inventory-warehouse"
              value={selectedWarehouseId}
              onChange={(event) => {
                setSelectedWarehouseId(event.target.value);
                setPage(1);
                setSuccessMessage("");
              }}
              className="rounded border border-[#dfe8dd] bg-white p-2 text-xs"
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#66736a]" />
              <input
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setPage(1);
                  setSuccessMessage("");
                }}
                className="w-full rounded border border-[#dfe8dd] p-2 pl-9 text-xs"
                placeholder="Tìm tên sản phẩm hoặc SKU..."
                aria-label="Tìm theo tên sản phẩm hoặc SKU"
              />
            </div>
            <label className="flex items-center gap-2 rounded border border-[#dfe8dd] px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(event) => {
                  setLowStockOnly(event.target.checked);
                  setPage(1);
                  setSuccessMessage("");
                }}
                className="accent-[#006948]"
              />
              Chỉ tồn thấp
            </label>
          </div>

          {loading && <p className="py-8 text-center text-xs text-[#66736a]">Đang tải dữ liệu tồn kho...</p>}
          {!loading && warehouseError && (
            <p className="py-8 text-center text-xs text-[#66736a]">
              Cần tải danh sách kho thành công trước khi hiển thị tồn kho.
            </p>
          )}
          {!loading && !loadError && !warehouseError && visibleItems.length === 0 && (
            <p className="rounded-lg bg-[#f7faf5] px-4 py-8 text-center text-xs text-[#66736a]">
              Không tìm thấy dòng tồn kho phù hợp với bộ lọc.
            </p>
          )}
          {!loading && !loadError && visibleItems.length > 0 && (
            <>
              <div className="divide-y divide-[#e7eee4]">
                {visibleItems.map((item) => (
                  <div
                    className={`grid gap-3 p-4 text-xs sm:grid-cols-[1fr_auto_auto] ${item.isLowStock ? "bg-[#fffdf5]" : ""}`}
                    key={`${item.productId}-${item.warehouseId}`}
                  >
                    <span>
                      <b>{item.productName}</b>
                      <small className="block text-[10px] text-[#66736a]">
                        {item.productCode} · {item.warehouseName}
                      </small>
                    </span>
                    <span className="grid grid-cols-3 gap-3 sm:gap-5">
                      <span>Tồn <b>{formatQuantity(item.quantity)}</b></span>
                      <span>Giữ <b>{formatQuantity(item.reservedQuantity)}</b></span>
                      <span>Khả dụng <b>{formatQuantity(item.availableQuantity)}</b></span>
                    </span>
                    <span className="flex items-center justify-between gap-2 sm:justify-end">
                      <small className="text-[#66736a]">Ngưỡng {formatQuantity(item.minStockAlert)}</small>
                      <StatusBadge tone={item.isLowStock ? "amber" : "green"}>
                        {item.isLowStock ? "Cảnh báo" : "An toàn"}
                      </StatusBadge>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#66736a]">
                <span>Trang {page} / {totalPages} · {totalCount} dòng</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Trang trước"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded border border-[#dfe8dd] p-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Trang sau"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded border border-[#dfe8dd] p-2 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Cảnh Báo Tồn Thấp">
          {lowStockItems.length === 0 ? (
            <p className="rounded bg-[#f7faf5] p-3 text-xs text-[#66736a]">
              Không có mặt hàng tồn thấp trong trang hiện tại.
            </p>
          ) : (
            lowStockItems.map((item) => (
              <div
                className="mt-3 rounded bg-[#fffdf5] p-3 text-xs"
                key={`${item.productId}-${item.warehouseId}`}
              >
                <b>{item.productName}</b>
                <small className="block text-[#66736a]">{item.productCode} · {item.warehouseName}</small>
                <small className="mt-1 block text-[#b45309]">
                  Khả dụng {formatQuantity(item.availableQuantity)} / ngưỡng {formatQuantity(item.minStockAlert)}
                </small>
              </div>
            ))
          )}
        </Panel>
      </div>
      </>
      ) : (
        <StockTransactionsPanel
          warehouses={warehouses}
          page={transactionPage}
          refreshVersion={transactionReloadCount}
          onOpenTransfer={openTransferModal}
          onStockChanged={reloadStockData}
          onPageChange={setTransactionPage}
        />
      )}

      {createWarehouseModalOpen && (
        <AdminModal
          title="Thêm kho mới"
          description="Kho mới sẽ được kích hoạt và xuất hiện trong bộ lọc kho."
          onClose={closeCreateWarehouseModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeCreateWarehouseModal}
                disabled={createWarehouseSaving}
                className="rounded-lg border border-[#dfe8dd] px-4 py-2 text-xs font-bold text-[#425247] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="create-warehouse-form"
                disabled={createWarehouseSaving}
                className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {createWarehouseSaving ? "Đang tạo..." : "Tạo kho"}
              </button>
            </>
          }
        >
          <form id="create-warehouse-form" onSubmit={(event) => void submitCreateWarehouse(event)} className="space-y-4">
            <label className="block text-xs font-semibold">
              Tên kho <span className="text-red-600">*</span>
              <input
                required
                maxLength={200}
                autoFocus
                value={createWarehouseForm.name}
                disabled={createWarehouseSaving}
                onChange={(event) => {
                  setCreateWarehouseForm((current) => ({ ...current, name: event.target.value }));
                  setCreateWarehouseError("");
                }}
                className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
                placeholder="Ví dụ: Kho chi nhánh Quận 3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Địa chỉ
                <input
                  value={createWarehouseForm.address ?? ""}
                  disabled={createWarehouseSaving}
                  onChange={(event) => setCreateWarehouseForm((current) => ({ ...current, address: event.target.value }))}
                  className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
                  placeholder="Địa chỉ kho"
                />
              </label>
              <label className="block text-xs font-semibold">
                Số điện thoại
                <input
                  type="tel"
                  value={createWarehouseForm.phone ?? ""}
                  disabled={createWarehouseSaving}
                  onChange={(event) => setCreateWarehouseForm((current) => ({ ...current, phone: event.target.value }))}
                  className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
                  placeholder="Số điện thoại liên hệ"
                />
              </label>
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-[#dfe8dd] p-3 text-xs">
              <input
                type="checkbox"
                checked={createWarehouseForm.isDefault}
                disabled={createWarehouseSaving}
                onChange={(event) => setCreateWarehouseForm((current) => ({ ...current, isDefault: event.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <b className="block">Đặt làm kho mặc định</b>
                <span className="text-[#66736a]">Kho mặc định hiện tại sẽ được thay thế.</span>
              </span>
            </label>
            {createWarehouseError && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {createWarehouseError}
              </div>
            )}
          </form>
        </AdminModal>
      )}

      {editWarehouseTarget && (
        <AdminModal
          title="Sửa thông tin kho"
          description="Các lựa chọn nghiệp vụ chỉ hiển thị những kho đang hoạt động."
          onClose={closeEditWarehouseModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeEditWarehouseModal}
                disabled={warehouseActionBusy}
                className="rounded-lg border border-[#dfe8dd] px-4 py-2 text-xs font-bold text-[#425247] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="edit-warehouse-form"
                disabled={warehouseActionBusy}
                className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {warehouseActionBusy ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </>
          }
        >
          <form id="edit-warehouse-form" onSubmit={(event) => void submitEditWarehouse(event)} className="space-y-4">
            <label className="block text-xs font-semibold">
              Tên kho <span className="text-red-600">*</span>
              <input
                required
                maxLength={200}
                autoFocus
                value={editWarehouseForm.name}
                disabled={warehouseActionBusy}
                onChange={(event) => {
                  setEditWarehouseForm((current) => ({ ...current, name: event.target.value }));
                  setEditWarehouseError("");
                }}
                className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Địa chỉ
                <input
                  value={editWarehouseForm.address ?? ""}
                  disabled={warehouseActionBusy}
                  onChange={(event) => setEditWarehouseForm((current) => ({ ...current, address: event.target.value }))}
                  className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
                />
              </label>
              <label className="block text-xs font-semibold">
                Số điện thoại
                <input
                  type="tel"
                  value={editWarehouseForm.phone ?? ""}
                  disabled={warehouseActionBusy}
                  onChange={(event) => setEditWarehouseForm((current) => ({ ...current, phone: event.target.value }))}
                  className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
                />
              </label>
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-[#dfe8dd] p-3 text-xs">
              <input
                type="checkbox"
                checked={editWarehouseForm.isDefault}
                disabled={warehouseActionBusy}
                onChange={(event) => setEditWarehouseForm((current) => ({ ...current, isDefault: event.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <b className="block">Đặt làm kho mặc định</b>
                <span className="text-[#66736a]">Kho mặc định hiện tại sẽ được thay thế.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-[#dfe8dd] p-3 text-xs">
              <input
                type="checkbox"
                checked={editWarehouseForm.isActive}
                disabled={warehouseActionBusy}
                onChange={(event) => setEditWarehouseForm((current) => ({ ...current, isActive: event.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <b className="block">Kho đang hoạt động</b>
                <span className="text-[#66736a]">Kho ngừng hoạt động sẽ không xuất hiện trong các lựa chọn nghiệp vụ.</span>
              </span>
            </label>
            {editWarehouseError && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {editWarehouseError}
              </div>
            )}
          </form>
        </AdminModal>
      )}

      {deleteWarehouseTarget && (
        <AdminModal
          title="Xác nhận xóa kho"
          description="Đây là thao tác xóa cứng và không thể hoàn tác."
          onClose={closeDeleteWarehouseConfirmation}
          footer={
            <>
              <button
                type="button"
                onClick={closeDeleteWarehouseConfirmation}
                disabled={warehouseActionBusy}
                className="rounded-lg border border-[#dfe8dd] px-4 py-2 text-xs font-bold text-[#425247] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteWarehouse()}
                disabled={warehouseActionBusy}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {warehouseActionBusy ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-[#f7faf5] p-3">
              <b className="block text-sm">{deleteWarehouseTarget.name}</b>
              <span className="mt-1 block break-all text-[#66736a]">Mã kho: {deleteWarehouseTarget.id}</span>
            </div>
            <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
              Kho đang được tồn kho, giao dịch kho, đơn mua hàng hoặc đơn hàng tham chiếu sẽ không thể xóa.
            </p>
            {deleteWarehouseError && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                {deleteWarehouseError}
              </div>
            )}
          </div>
        </AdminModal>
      )}

      {transferModalOpen && (
        <AdminModal
          title="Chuyển hàng giữa các kho"
          description="Hệ thống tạo giao dịch xuất và nhập đối ứng; số lượng khả dụng được kiểm tra lại tại máy chủ."
          onClose={closeTransferModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeTransferModal}
                disabled={transferSaving}
                className="rounded-lg border border-[#dfe8dd] px-4 py-2 text-xs font-bold text-[#425247] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="stock-transfer-form"
                disabled={transferSaving || transferProductsLoading || warehouses.length < 2}
                className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {transferSaving ? "Đang chuyển..." : "Xác nhận chuyển"}
              </button>
            </>
          }
        >
          <form id="stock-transfer-form" onSubmit={submitTransfer} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Kho nguồn
                <select
                  required
                  value={transferSourceWarehouseId}
                  disabled={transferSaving}
                  onChange={(event) => {
                    setTransferSourceWarehouseId(event.target.value);
                    setTransferLines([]);
                    setTransferError("");
                    transferIdRef.current = null;
                  }}
                  className="mt-1 w-full rounded border border-[#dfe8dd] bg-white p-2 font-normal"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Kho đích
                <select
                  required
                  value={transferDestinationWarehouseId}
                  disabled={transferSaving}
                  onChange={(event) => {
                    setTransferDestinationWarehouseId(event.target.value);
                    setTransferError("");
                    transferIdRef.current = null;
                  }}
                  className="mt-1 w-full rounded border border-[#dfe8dd] bg-white p-2 font-normal"
                >
                  <option value="">Chọn kho đích</option>
                  {warehouses
                    .filter((warehouse) => warehouse.id !== transferSourceWarehouseId)
                    .map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-[#e7eee4] p-3">
              <h3 className="text-xs font-bold">Thêm sản phẩm chuyển kho</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(140px,1fr)_minmax(160px,1.2fr)_auto]">
                <input
                  value={transferSearchText}
                  onChange={(event) => setTransferSearchText(event.target.value)}
                  disabled={transferSaving}
                  className="rounded border border-[#dfe8dd] p-2 text-xs"
                  placeholder="Tìm tên hoặc SKU..."
                  aria-label="Tìm sản phẩm ở kho nguồn"
                />
                <select
                  value={candidateProductId}
                  onChange={(event) => setCandidateProductId(event.target.value)}
                  disabled={transferSaving || transferProductsLoading || transferCandidates.length === 0}
                  className="rounded border border-[#dfe8dd] bg-white p-2 text-xs"
                  aria-label="Chọn sản phẩm"
                >
                  {transferCandidates.length === 0 && <option value="">Không có sản phẩm khả dụng</option>}
                  {transferCandidates.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productCode} — {item.productName} (khả dụng {formatQuantity(item.availableQuantity)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addTransferLine}
                  disabled={transferSaving || transferProductsLoading || transferCandidates.length === 0}
                  className="flex items-center justify-center gap-1 rounded bg-[#eff7ed] px-3 py-2 text-xs font-bold text-[#006948] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Thêm
                </button>
              </div>
              {transferProductsLoading && <p className="mt-2 text-[10px] text-[#66736a]">Đang tìm sản phẩm...</p>}
              {transferLookupError && <p role="alert" className="mt-2 text-xs text-red-700">{transferLookupError}</p>}
              {!transferProductsLoading && !transferLookupError && transferCandidates.length === 0 && (
                <p className="mt-2 text-[10px] text-[#66736a]">Không tìm thấy sản phẩm còn tồn khả dụng.</p>
              )}
            </div>

            <div className="space-y-2">
              {transferLines.map((line) => (
                <div key={line.productId} className="grid items-center gap-2 rounded-lg bg-[#f7faf5] p-3 sm:grid-cols-[1fr_130px_auto]">
                  <div className="text-xs">
                    <b>{line.productName}</b>
                    <small className="block text-[#66736a]">{line.productCode} · khả dụng {formatQuantity(line.availableQuantity)}</small>
                  </div>
                  <label className="text-[10px] text-[#66736a]">
                    Số lượng
                    <input
                      type="number"
                      min="0.001"
                      max={line.availableQuantity}
                      step="0.001"
                      required
                      value={line.quantity}
                      disabled={transferSaving}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTransferLines((current) => current.map((item) =>
                          item.productId === line.productId ? { ...item, quantity: value } : item
                        ));
                        setTransferError("");
                        transferIdRef.current = null;
                      }}
                      className="mt-1 w-full rounded border border-[#dfe8dd] bg-white p-2 text-xs text-[#17231b]"
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Xóa ${line.productName}`}
                    disabled={transferSaving}
                    onClick={() => {
                      setTransferLines((current) => current.filter((item) => item.productId !== line.productId));
                      setTransferError("");
                      transferIdRef.current = null;
                    }}
                    className="justify-self-end rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {transferLines.length === 0 && (
                <p className="rounded-lg border border-dashed border-[#dfe8dd] p-4 text-center text-xs text-[#66736a]">
                  Chưa có sản phẩm trong phiếu.
                </p>
              )}
            </div>

            <label className="block text-xs font-semibold">
              Ghi chú (không bắt buộc)
              <textarea
                maxLength={2000}
                rows={2}
                value={transferNotes}
                disabled={transferSaving}
                onChange={(event) => {
                  setTransferNotes(event.target.value);
                  transferIdRef.current = null;
                }}
                className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
                placeholder="Ví dụ: Điều chuyển bổ sung hàng cho chi nhánh..."
              />
            </label>
            {transferError && (
              <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {transferError}
              </div>
            )}
          </form>
        </AdminModal>
      )}
    </>
  );
}
