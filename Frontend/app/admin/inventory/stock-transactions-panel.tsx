"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ChevronLeft, ChevronRight, Eye, Plus, Trash2 } from "lucide-react";
import { AdminModal, DataTable, StatusBadge } from "../../../components/admin/admin-ui";
import { createStockTransaction, getStockTransactionByBatchId, getStockTransactions } from "../../../services/inventory/inventory.service";
import { getProducts } from "../../../services/products/product.service";
import type {
  PaginatedResponse,
  Product,
  ProblemDetails,
  StockTransaction,
  StockTransactionQuery,
  StockTransactionRequest,
  Warehouse
} from "../../../types/api";

const pageSize = 20;
const transactionTypes = ["Import", "Export", "Count", "Adjust"] as const;
type TransactionType = typeof transactionTypes[number];

interface Filters {
  transactionType: TransactionType | "";
  warehouseId: string;
  productId: string;
  referenceType: string;
  referenceId: string;
  fromDate: string;
  toDate: string;
}

interface RequestState {
  requestKey: string;
  result?: PaginatedResponse<StockTransaction>;
  error?: string;
}

interface ProductLookupResult {
  search: string;
  products: Product[];
  error?: string;
}

interface TransactionLineDraft {
  productId: string;
  productCode: string;
  productName: string;
  value: string;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ProblemDetails>(error)) {
    const status = error.response?.status;
    if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Tài khoản không có quyền quản lý kho (ManageOperations).";

    const data = error.response?.data;
    const validationErrors = Object.values(data?.errors ?? {}).flat().filter(Boolean);
    if (validationErrors.length > 0) return validationErrors.join(" ");
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
    if (!error.response) return "Không thể kết nối máy chủ. Hãy kiểm tra API và thử lại.";
    return fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

function localDateBoundary(value: string, dayOffset = 0) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day + dayOffset).toISOString();
}

function transactionLabel(type: string) {
  switch (type) {
    case "Import": return "Nhập kho";
    case "Export": return "Xuất kho";
    case "Count": return "Kiểm kê";
    case "Adjust": return "Điều chỉnh";
    default: return type;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatQuantity(value: number | null | undefined) {
  return value == null ? "—" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);
}

async function getActiveProducts(search: string) {
  const params = { pageSize: 100, isActive: true, search: search || undefined };
  const firstPage = await getProducts({ ...params, page: 1 });
  if (firstPage.totalPages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      getProducts({ ...params, page: index + 2 })
    )
  );
  return firstPage.items.concat(...remainingPages.map((response) => response.items));
}

export default function StockTransactionsPanel({
  warehouses,
  page,
  refreshVersion,
  onOpenTransfer,
  onStockChanged,
  onPageChange
}: {
  warehouses: Warehouse[];
  page: number;
  refreshVersion: number;
  onOpenTransfer: () => void;
  onStockChanged: () => void;
  onPageChange: (page: number) => void;
}) {
  const [filters, setFilters] = useState<Filters>({
    transactionType: "",
    warehouseId: "",
    productId: "",
    referenceType: "",
    referenceId: "",
    fromDate: "",
    toDate: ""
  });
  const [historyReloadCount, setHistoryReloadCount] = useState(0);
  const [requestState, setRequestState] = useState<RequestState | null>(null);
  const [filterProductSearch, setFilterProductSearch] = useState("");
  const [filterProductResult, setFilterProductResult] = useState<ProductLookupResult | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [detailReloadCount, setDetailReloadCount] = useState(0);
  const [detailState, setDetailState] = useState<{ batchId: string; reloadCount: number; transaction?: StockTransaction; error?: string } | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("Import");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransactionLineDraft[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productResult, setProductResult] = useState<ProductLookupResult | null>(null);
  const [candidateProductId, setCandidateProductId] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const requestKey = JSON.stringify([page, filters, refreshVersion, historyReloadCount]);
  const currentRequest = requestState?.requestKey === requestKey ? requestState : null;
  const currentDetailState = detailState?.batchId === selectedBatchId &&
    detailState.reloadCount === detailReloadCount
    ? detailState
    : null;
  const filterProductQuery = filterProductSearch.trim();
  const filterProducts = filterProductResult?.search === filterProductQuery ? filterProductResult.products : [];
  const filterProductsLoading = filterProductResult?.search !== filterProductQuery;
  const filterProductsError = filterProductResult?.search === filterProductQuery ? filterProductResult.error ?? "" : "";
  const productQuery = productSearch.trim();
  const products = productResult?.search === productQuery ? productResult.products : [];
  const productsLoading = createModalOpen && productResult?.search !== productQuery;
  const productsError = productResult?.search === productQuery ? productResult.error ?? "" : "";
  const result = currentRequest?.result ?? null;
  const dateRangeError = Boolean(filters.fromDate && filters.toDate && filters.fromDate > filters.toDate);
  const loadError = dateRangeError
    ? "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."
    : currentRequest?.error ?? "";
  const loading = !dateRangeError && currentRequest === null;

  const query = useMemo<StockTransactionQuery>(() => ({
    transactionType: filters.transactionType || undefined,
    warehouseId: filters.warehouseId || undefined,
    productId: filters.productId || undefined,
    referenceType: filters.referenceType.trim() || undefined,
    referenceId: filters.referenceId.trim() || undefined,
    fromDate: filters.fromDate ? localDateBoundary(filters.fromDate) : undefined,
    toDate: filters.toDate ? localDateBoundary(filters.toDate, 1) : undefined,
    page,
    pageSize
  }), [filters, page]);

  useEffect(() => {
    if (dateRangeError) return;

    let active = true;
    getStockTransactions(query)
      .then((response) => {
        if (active) setRequestState({ requestKey, result: response });
      })
      .catch((error: unknown) => {
        if (active) {
          setRequestState({
            requestKey,
            error: getApiErrorMessage(error, "Không thể tải lịch sử giao dịch kho.")
          });
        }
      });

    return () => {
      active = false;
    };
  }, [dateRangeError, historyReloadCount, query, requestKey]);

  useEffect(() => {
    let active = true;
    const search = filterProductSearch.trim();
    const timeout = window.setTimeout(() => {
      getActiveProducts(search)
        .then((products) => {
          if (active) setFilterProductResult({ search, products });
        })
        .catch((error: unknown) => {
          if (active) {
            setFilterProductResult({
              search,
              products: [],
              error: getApiErrorMessage(error, "Không thể tìm sản phẩm để lọc lịch sử.")
            });
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [filterProductSearch]);

  useEffect(() => {
    if (!selectedBatchId) return;
    const batchId = selectedBatchId;
    const reloadCount = detailReloadCount;
    let active = true;
    getStockTransactionByBatchId(batchId)
      .then((transaction) => {
        if (active) setDetailState({ batchId, reloadCount, transaction });
      })
      .catch((error: unknown) => {
        if (active) {
          setDetailState({
            batchId,
            reloadCount,
            error: getApiErrorMessage(error, "Không thể tải chi tiết phiếu giao dịch.")
          });
        }
      });

    return () => {
      active = false;
    };
  }, [selectedBatchId, detailReloadCount]);

  useEffect(() => {
    if (!createModalOpen) return;
    let active = true;
    const search = productSearch.trim();
    const timeout = window.setTimeout(() => {
      getActiveProducts(search)
        .then((activeProducts) => {
          if (!active) return;
          setProductResult({ search, products: activeProducts });
          setCandidateProductId((current) =>
            activeProducts.some((product) => product.id === current && !lines.some((line) => line.productId === current))
              ? current
              : activeProducts.find((product) => !lines.some((line) => line.productId === product.id))?.id ?? ""
          );
        })
        .catch((error: unknown) => {
          if (active) {
            setProductResult({
              search,
              products: [],
              error: getApiErrorMessage(error, "Không thể tìm sản phẩm đang hoạt động.")
            });
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [createModalOpen, lines, productSearch]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    onPageChange(1);
    setSuccessMessage("");
  }

  function openCreateModal() {
    setTransactionType("Import");
    setWarehouseId(warehouses[0]?.id ?? "");
    setNotes("");
    setLines([]);
    setProductSearch("");
    setFormError("");
    setSuccessMessage("");
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;
    setCreateModalOpen(false);
    setFormError("");
  }

  function addProductLine() {
    const product = products.find((item) => item.id === candidateProductId);
    if (!product) {
      setFormError("Hãy chọn một sản phẩm đang hoạt động.");
      return;
    }
    if (lines.some((line) => line.productId === product.id)) {
      setFormError("Sản phẩm này đã có trong phiếu.");
      return;
    }

    setLines((current) => [...current, {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      value: transactionType === "Count" ? "0" : "1"
    }]);
    setFormError("");
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!warehouseId) {
      setFormError("Hãy chọn kho đang hoạt động.");
      return;
    }
    if (lines.length === 0) {
      setFormError("Phiếu phải có ít nhất một sản phẩm.");
      return;
    }

    const requestLines: StockTransactionRequest["lines"] = [];
    for (const line of lines) {
      const value = Number(line.value);
      if (!Number.isFinite(value) || (transactionType === "Count" ? value < 0 : transactionType === "Adjust" ? value === 0 : value <= 0)) {
        setFormError(transactionType === "Count"
          ? `Số đếm của ${line.productName} phải không âm.`
          : transactionType === "Adjust"
            ? `Mức điều chỉnh của ${line.productName} phải khác 0.`
            : `Số lượng của ${line.productName} phải lớn hơn 0.`);
        return;
      }
      if (Math.abs(value) >= 1_000_000_000_000_000) {
        setFormError(`Giá trị của ${line.productName} vượt giới hạn cho phép.`);
        return;
      }
      if (line.value.includes(".") && line.value.split(".")[1].length > 3) {
        setFormError(`Giá trị của ${line.productName} chỉ được có tối đa 3 chữ số thập phân.`);
        return;
      }

      requestLines.push({
        productId: line.productId,
        quantity: transactionType === "Import" || transactionType === "Export" ? value : undefined,
        countedQuantity: transactionType === "Count" ? value : undefined,
        adjustment: transactionType === "Adjust" ? value : undefined
      });
    }

    if (transactionType === "Adjust" && !notes.trim()) {
      setFormError("Điều chỉnh kho bắt buộc có ghi chú nêu rõ lý do.");
      return;
    }

    const request: StockTransactionRequest = {
      warehouseId,
      transactionType,
      referenceType: "Manual",
      notes: notes.trim() || undefined,
      lines: requestLines
    };

    setSaving(true);
    try {
      await createStockTransaction(request);
      setCreateModalOpen(false);
      setSuccessMessage("Đã tạo phiếu giao dịch kho thành công. Tồn kho và lịch sử đã được tải lại.");
      onStockChanged();
    } catch (error: unknown) {
      setFormError(getApiErrorMessage(error, "Không thể tạo phiếu giao dịch kho."));
    } finally {
      setSaving(false);
    }
  }

  const items = result?.items ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalPages = Math.max(1, result?.totalPages ?? 0);

  return (
    <>
      <section className="rounded-xl border border-[#dfe8dd] bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Lịch sử giao dịch kho</h2>
            <p className="mt-1 text-xs text-[#66736a]">Tra cứu phiếu nhập, xuất, kiểm kê, điều chỉnh và chuyển kho.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenTransfer}
              disabled={warehouses.length < 2}
              title={warehouses.length < 2 ? "Cần ít nhất hai kho đang hoạt động." : undefined}
              className="rounded-lg border border-[#006948] px-4 py-2 text-xs font-bold text-[#006948] disabled:opacity-50"
            >
              Chuyển kho
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={warehouses.length === 0}
              className="flex items-center gap-1 rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Tạo phiếu
            </button>
          </div>
        </div>

        {successMessage && (
          <div role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
            {successMessage}
          </div>
        )}

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Loại giao dịch
            <select
              value={filters.transactionType}
              onChange={(event) => updateFilter("transactionType", event.target.value as TransactionType | "")}
              className="rounded-lg border border-[#dfe8dd] bg-white px-3 py-2 text-xs font-normal"
            >
              <option value="">Tất cả loại</option>
              {transactionTypes.map((type) => <option key={type} value={type}>{transactionLabel(type)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Kho
            <select
              value={filters.warehouseId}
              onChange={(event) => updateFilter("warehouseId", event.target.value)}
              className="rounded-lg border border-[#dfe8dd] bg-white px-3 py-2 text-xs font-normal"
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Tìm sản phẩm
            <input
              value={filterProductSearch}
              onChange={(event) => {
                setFilterProductSearch(event.target.value);
                updateFilter("productId", "");
              }}
              className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs font-normal"
              placeholder="Tên hoặc SKU..."
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Sản phẩm
            <select
              value={filters.productId}
              onChange={(event) => updateFilter("productId", event.target.value)}
              disabled={filterProductsLoading || Boolean(filterProductsError)}
              className="rounded-lg border border-[#dfe8dd] bg-white px-3 py-2 text-xs font-normal"
            >
              <option value="">Tất cả sản phẩm</option>
              {filterProducts.map((product) => <option key={product.id} value={product.id}>{product.code} — {product.name}</option>)}
            </select>
            {filterProductsError && <span role="alert" className="font-normal text-red-700">{filterProductsError}</span>}
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Loại tham chiếu
            <input
              value={filters.referenceType}
              onChange={(event) => updateFilter("referenceType", event.target.value)}
              className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs font-normal"
              placeholder="Transfer, Manual..."
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Mã tham chiếu (GUID)
            <input
              value={filters.referenceId}
              onChange={(event) => updateFilter("referenceId", event.target.value)}
              className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs font-normal"
              placeholder="Tùy chọn"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Từ ngày
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => updateFilter("fromDate", event.target.value)}
              className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#536156]">
            Đến ngày
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => updateFilter("toDate", event.target.value)}
              className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs font-normal"
            />
          </label>
        </div>

        {dateRangeError && <p role="alert" className="mb-3 text-xs text-red-700">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
        {loading && <p className="py-8 text-center text-xs text-[#66736a]">Đang tải lịch sử giao dịch...</p>}
        {!loading && loadError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
            <span>{loadError}</span>
            <button type="button" onClick={() => setHistoryReloadCount((current) => current + 1)} className="font-bold underline">Thử lại</button>
          </div>
        )}
        {!loading && !loadError && items.length === 0 && (
          <p className="rounded-lg bg-[#f7faf5] px-4 py-8 text-center text-xs text-[#66736a]">Không tìm thấy giao dịch phù hợp.</p>
        )}
        {!loading && !loadError && items.length > 0 && (
          <>
            <DataTable headers={["Ngày tạo", "Loại phiếu", "Kho", "Sản phẩm", "Tham chiếu", "Thao tác"]}>
              {items.map((transaction) => (
                <tr key={transaction.batchId}>
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(transaction.createdAt)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={transaction.transactionType === "Import" ? "green" : transaction.transactionType === "Export" ? "blue" : "amber"}>
                      {transactionLabel(transaction.transactionType)}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3">{transaction.warehouseName}</td>
                  <td className="px-3 py-3">
                    {transaction.lines.slice(0, 2).map((line) => (
                      <span key={line.id} className="block">{line.productCode} · {line.productName}</span>
                    ))}
                    {transaction.lines.length > 2 && <small className="text-[#66736a]">và {transaction.lines.length - 2} sản phẩm khác</small>}
                  </td>
                  <td className="px-3 py-3">
                    <span>{transaction.referenceType ?? "—"}</span>
                    {transaction.referenceId && <small className="block break-all text-[#66736a]">{transaction.referenceId}</small>}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBatchId(transaction.batchId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#dfe8dd] px-3 py-2 font-semibold text-[#006948]"
                    >
                      <Eye className="h-4 w-4" /> Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#66736a]">
              <span>Trang {result?.page ?? page} / {totalPages} · {totalCount} phiếu</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Trang trước"
                  disabled={page <= 1 || loading}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className="rounded border border-[#dfe8dd] p-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Trang sau"
                  disabled={page >= totalPages || loading}
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className="rounded border border-[#dfe8dd] p-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedBatchId && (
        <AdminModal
          title="Chi tiết phiếu giao dịch kho"
          description={`Batch: ${selectedBatchId}`}
          onClose={() => {
            setSelectedBatchId(null);
            setDetailState(null);
          }}
        >
          {!currentDetailState?.transaction && !currentDetailState?.error && (
            <p className="py-8 text-center text-xs text-[#66736a]">Đang tải chi tiết phiếu...</p>
          )}
          {currentDetailState?.error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <p>{currentDetailState.error}</p>
              <button type="button" onClick={() => setDetailReloadCount((current) => current + 1)} className="mt-2 font-bold underline">Thử lại</button>
            </div>
          )}
          {currentDetailState?.transaction && (
            <div className="space-y-4 text-xs">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div><dt className="text-[#66736a]">Loại phiếu</dt><dd className="font-semibold">{transactionLabel(currentDetailState.transaction.transactionType)}</dd></div>
                <div><dt className="text-[#66736a]">Kho</dt><dd className="font-semibold">{currentDetailState.transaction.warehouseName}</dd></div>
                <div><dt className="text-[#66736a]">Ngày tạo</dt><dd className="font-semibold">{formatDate(currentDetailState.transaction.createdAt)}</dd></div>
                <div><dt className="text-[#66736a]">Người tạo</dt><dd className="font-semibold">{currentDetailState.transaction.createdBy ?? "—"}</dd></div>
                <div><dt className="text-[#66736a]">Tham chiếu</dt><dd className="break-all font-semibold">{currentDetailState.transaction.referenceType ?? "—"}{currentDetailState.transaction.referenceId ? ` · ${currentDetailState.transaction.referenceId}` : ""}</dd></div>
                <div><dt className="text-[#66736a]">Ghi chú</dt><dd className="font-semibold">{currentDetailState.transaction.notes ?? "—"}</dd></div>
              </dl>
              <DataTable headers={["Sản phẩm", "Số lượng thay đổi", "Trước", "Sau", "Số đếm"]}>
                {currentDetailState.transaction.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-3">{line.productCode} · {line.productName}</td>
                    <td className="px-3 py-3">{formatQuantity(line.quantity)}</td>
                    <td className="px-3 py-3">{formatQuantity(line.quantityBefore)}</td>
                    <td className="px-3 py-3">{formatQuantity(line.quantityAfter)}</td>
                    <td className="px-3 py-3">{formatQuantity(line.countedQuantity)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          )}
        </AdminModal>
      )}

      {createModalOpen && (
        <AdminModal
          title="Tạo phiếu giao dịch kho"
          description="Tồn kho khả dụng sẽ được kiểm tra lại tại máy chủ trước khi ghi nhận."
          onClose={closeCreateModal}
          footer={(
            <>
              <button type="button" onClick={closeCreateModal} disabled={saving} className="rounded-lg border border-[#dfe8dd] px-4 py-2 text-xs font-bold text-[#425247] disabled:opacity-50">Hủy</button>
              <button type="submit" form="stock-transaction-form" disabled={saving || productsLoading || warehouses.length === 0} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {saving ? "Đang lưu..." : "Tạo phiếu"}
              </button>
            </>
          )}
        >
          <form id="stock-transaction-form" onSubmit={(event) => void submitTransaction(event)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Loại giao dịch
                <select
                  value={transactionType}
                  disabled={saving}
                  onChange={(event) => {
                    setTransactionType(event.target.value as TransactionType);
                    setLines([]);
                    setFormError("");
                  }}
                  className="mt-1 w-full rounded border border-[#dfe8dd] bg-white p-2 font-normal"
                >
                  {transactionTypes.map((type) => <option key={type} value={type}>{transactionLabel(type)}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Kho
                <select
                  required
                  value={warehouseId}
                  disabled={saving || warehouses.length === 0}
                  onChange={(event) => setWarehouseId(event.target.value)}
                  className="mt-1 w-full rounded border border-[#dfe8dd] bg-white p-2 font-normal"
                >
                  {warehouses.length === 0 && <option value="">Không có kho đang hoạt động</option>}
                  {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-[#e7eee4] p-3">
              <h3 className="text-xs font-bold">Thêm sản phẩm</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(140px,1fr)_minmax(160px,1.2fr)_auto]">
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  disabled={saving}
                  className="rounded border border-[#dfe8dd] p-2 text-xs"
                  placeholder="Tìm tên hoặc SKU..."
                  aria-label="Tìm sản phẩm đang hoạt động"
                />
                <select
                  value={candidateProductId}
                  onChange={(event) => setCandidateProductId(event.target.value)}
                  disabled={saving || productsLoading || products.length === 0}
                  className="rounded border border-[#dfe8dd] bg-white p-2 text-xs"
                  aria-label="Chọn sản phẩm"
                >
                  {products.length === 0 && <option value="">Không tìm thấy sản phẩm đang hoạt động</option>}
                  {products.map((product) => (
                    <option key={product.id} value={product.id} disabled={lines.some((line) => line.productId === product.id)}>
                      {product.code} — {product.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addProductLine} disabled={saving || productsLoading || products.length === 0} className="flex items-center justify-center gap-1 rounded bg-[#eff7ed] px-3 py-2 text-xs font-bold text-[#006948] disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Thêm
                </button>
              </div>
              {productsLoading && <p className="mt-2 text-[10px] text-[#66736a]">Đang tìm sản phẩm...</p>}
              {productsError && <p role="alert" className="mt-2 text-xs text-red-700">{productsError}</p>}
              {lines.map((line) => (
                <div key={line.productId} className="mt-2 grid items-center gap-2 rounded-lg bg-[#f7faf5] p-3 sm:grid-cols-[1fr_150px_auto]">
                  <div className="text-xs">
                    <b>{line.productName}</b>
                    <small className="block text-[#66736a]">{line.productCode}</small>
                  </div>
                  <label className="text-[10px] text-[#66736a]">
                    {transactionType === "Count" ? "Số lượng kiểm kê" : transactionType === "Adjust" ? "Mức điều chỉnh (+/-)" : "Số lượng"}
                    <input
                      type="number"
                      min={transactionType === "Count" ? "0" : transactionType === "Adjust" ? "-999999999999999.999" : "0.001"}
                      max="999999999999999.999"
                      step="0.001"
                      required
                      value={line.value}
                      disabled={saving}
                      onChange={(event) => {
                        const value = event.target.value;
                        setLines((current) => current.map((item) => item.productId === line.productId ? { ...item, value } : item));
                        setFormError("");
                      }}
                      className="mt-1 w-full rounded border border-[#dfe8dd] bg-white p-2 text-xs text-[#17231b]"
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Xóa ${line.productName}`}
                    disabled={saving}
                    onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))}
                    className="justify-self-end rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {lines.length === 0 && <p className="mt-3 rounded-lg border border-dashed border-[#dfe8dd] p-4 text-center text-xs text-[#66736a]">Chưa có sản phẩm trong phiếu.</p>}
            </div>

            <label className="block text-xs font-semibold">
              Ghi chú {transactionType === "Adjust" ? <span className="text-red-600">*</span> : "(không bắt buộc)"}
              <textarea
                maxLength={2000}
                rows={3}
                required={transactionType === "Adjust"}
                value={notes}
                disabled={saving}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded border border-[#dfe8dd] p-2 text-xs font-normal"
                placeholder={transactionType === "Adjust" ? "Nêu rõ lý do điều chỉnh..." : "Ghi chú cho phiếu..."}
              />
            </label>
            {formError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
          </form>
        </AdminModal>
      )}
    </>
  );
}
