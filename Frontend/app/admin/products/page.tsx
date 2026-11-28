"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  categories as mockCategories
} from "../../../data/mock";
import { categoryRepository } from "../../../services/categories/category.repository";
import { productRepository } from "../../../services/products/product.repository";
import { unitRepository } from "../../../services/units/unit.service";
import type {
  Category,
  CategoryRequest,
  Product,
  ProductImage,
  ProductRequest,
  Unit,
  UnitRequest
} from "../../../types/api";
import { formatCurrency } from "../../../lib/formatters";
import {
  DataTable,
  AdminModal,
  IconButton,
  PageHeader,
  StatusBadge
} from "../../../components/admin/admin-ui";
import Image from "next/image";
import { Plus, Edit, Trash2, Pause, Play, X, Eye } from "lucide-react";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
const productPageSize = 10;
const emptyProduct: ProductRequest = {
  code: "",
  name: "",
  categoryId: "",
  unitId: "",
  description: "",
  shortDescription: "",
  costPrice: 0,
  sellingPrice: 0,
  minStockAlert: 0,
  expiryDays: undefined,
  isActive: true,
  isFeatured: false
};
const emptyCategory: CategoryRequest = {
  name: "",
  description: "",
  parentId: null,
  image: "",
  isActive: true,
  sortOrder: 1
};

function errorMessage(error: unknown) {
  const response = (error as { response?: { data?: { detail?: string } } })
    .response;
  return (
    response?.data?.detail ??
    (error instanceof Error
      ? error.message
      : "Có lỗi xảy ra, vui lòng thử lại.")
  );
}

function categoryName(id: string, all: Category[]) {
  return all.find((item) => item.id === id)?.name ?? "";
}

function getCategoryTreeRows(categories: Category[]) {
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenByParent = new Map<string, Category[]>();
  for (const category of sorted) {
    const parentKey = category.parentId ?? "";
    const children = childrenByParent.get(parentKey) ?? [];
    children.push(category);
    childrenByParent.set(parentKey, children);
  }

  const rows: Array<{ category: Category; depth: number }> = [];
  const visited = new Set<string>();
  function visit(items: Category[], depth: number, ancestors: Set<string>) {
    for (const category of items) {
      if (ancestors.has(category.id) || visited.has(category.id)) continue;
      visited.add(category.id);
      rows.push({ category, depth });
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(category.id);
      visit(childrenByParent.get(category.id) ?? [], depth + 1, nextAncestors);
    }
  }

  visit(childrenByParent.get("") ?? [], 0, new Set());
  for (const category of sorted) {
    if (!visited.has(category.id)) visit([category], 0, new Set());
  }
  return rows;
}

function getCategoryDescendantIds(categoryId: string, categories: Category[]) {
  const descendants = new Set<string>();
  const pending = [categoryId];
  while (pending.length) {
    const parentId = pending.pop()!;
    for (const category of categories) {
      if (category.parentId === parentId && !descendants.has(category.id)) {
        descendants.add(category.id);
        pending.push(category.id);
      }
    }
  }
  return descendants;
}

export default function ProductsAdminPage() {
  const [tab, setTab] = useState<"categories" | "products" | "units">("products");
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [unitModal, setUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState<UnitRequest>({
    name: "",
    symbol: "",
    description: ""
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [productForm, setProductForm] = useState<ProductRequest>(emptyProduct);
  const [categoryForm, setCategoryForm] =
    useState<CategoryRequest>(emptyCategory);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newMainIndex, setNewMainIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const productRequestId = useRef(0);

  const loadProducts = useCallback(async (
    search: string,
    requestedPage: number,
    requestedStatus: string
  ) => {
    const requestId = ++productRequestId.current;
    setLoading(true);
    try {
      const result = await productRepository.getProducts({
        page: requestedPage,
        pageSize: productPageSize,
        search: search.trim() || undefined,
        isActive: requestedStatus === "all" ? undefined : requestedStatus === "active"
      });
      if (requestId !== productRequestId.current) return;
      const lastPage = Math.max(result.totalPages, 1);
      setProducts(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(lastPage);
      if (requestedPage > lastPage) setPage(lastPage);
    } catch (loadError) {
      if (requestId === productRequestId.current) setError(errorMessage(loadError));
    } finally {
      if (requestId === productRequestId.current) setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategories((await categoryRepository.getCategories()).items);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
      if (!useMock)
        void unitRepository.getUnits()
          .then((result) => setUnits(result.items))
          .catch((loadError) => setError(errorMessage(loadError)));
      else
        void unitRepository.getUnits().then((result) => setUnits(result.items));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts(query, page, status);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadProducts, page, query, status]);

  const categoryRows = useMemo(() => getCategoryTreeRows(categories), [categories]);
  const excludedCategoryParents = editingCategory
    ? getCategoryDescendantIds(editingCategory.id, categories)
    : new Set<string>();

  function openCreateProduct() {
    setEditingProduct(null);
    setProductForm({
      ...emptyProduct,
      categoryId: categories[0]?.id ?? "",
      unitId: units[0]?.id ?? ""
    });
    setImages([]);
    setNewImages([]);
    setNewMainIndex(0);
    setError("");
    setProductModal(true);
  }

  async function openEditProduct(product: Product) {
    try {
      const detail = await productRepository.getProductById(product.id);
      setEditingProduct(detail);
      setProductForm({
        code: detail.code,
        name: detail.name,
        categoryId: detail.categoryId,
        unitId: detail.unitId,
        description: detail.description ?? "",
        shortDescription: detail.shortDescription ?? "",
        costPrice: detail.costPrice,
        sellingPrice: detail.sellingPrice,
        minStockAlert: detail.minStockAlert,
        expiryDays: detail.expiryDays || undefined,
        isActive: detail.isActive,
        isFeatured: detail.isFeatured
      });
      setImages(detail.images ?? []);
      setNewImages([]);
      setNewMainIndex(0);
      setError("");
      setProductModal(true);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  function openCreateCategory() {
    setEditingCategory(null);
    setCategoryForm({ ...emptyCategory, sortOrder: categories.length + 1 });
    setError("");
    setCategoryModal(true);
  }
  function openCreateUnit() {
    setEditingUnit(null);
    setUnitForm({ name: "", symbol: "", description: "" });
    setError("");
    setUnitModal(true);
  }
  function openEditUnit(unit: Unit) {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      symbol: unit.symbol ?? unit.abbreviation ?? "",
      description: ""
    });
    setError("");
    setUnitModal(true);
  }
  async function submitUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unitForm.name.trim() || !unitForm.symbol.trim()) {
      setError("Vui lòng nhập tên và ký hiệu đơn vị.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editingUnit) await unitRepository.updateUnit(editingUnit.id, unitForm);
      else await unitRepository.createUnit(unitForm);
      setUnitModal(false);
      setUnits((await unitRepository.getUnits()).items);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }
  function openEditCategory(category: Category) {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description ?? "",
      parentId: category.parentId,
      image: category.image ?? "",
      isActive: category.isActive,
      sortOrder: category.sortOrder
    });
    setError("");
    setCategoryModal(true);
  }

  function chooseImages(files: FileList | null) {
    const selected = Array.from(files ?? []);
    const invalid = selected.find(
      (file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024
    );
    if (invalid) {
      setError("Mỗi ảnh phải là tệp hình ảnh và không vượt quá 5MB.");
      return;
    }
    setNewImages((current) => [...current, ...selected]);
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !productForm.code.trim() ||
      !productForm.name.trim() ||
      !productForm.categoryId ||
      !productForm.unitId ||
      productForm.sellingPrice < 0.01 ||
      (!editingProduct && !newImages.length)
    ) {
      setError("Vui lòng nhập đủ thông tin bắt buộc và chọn ít nhất một ảnh.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const saved = editingProduct
        ? await productRepository.updateProduct(editingProduct.id, productForm)
        : await productRepository.createProduct(productForm);
      const uploadedImages: ProductImage[] = [];
      for (const file of newImages)
        uploadedImages.push(
          (await productRepository.uploadProductImage(
            saved.id,
            file
          )) as ProductImage
        );
      if (uploadedImages.length && newMainIndex < uploadedImages.length) {
        await productRepository.setProductMainImage(
          saved.id,
          uploadedImages[newMainIndex].id
        );
      }
      setProductModal(false);
      const nextPage = editingProduct ? page : 1;
      if (!editingProduct) setPage(1);
      await loadProducts(query, nextPage, status);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryForm.name.trim()) {
      setError("Tên danh mục là bắt buộc.");
      return;
    }
    if (categoryForm.parentId === editingCategory?.id) {
      setError("Danh mục không thể là cha của chính nó.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (editingCategory)
        await categoryRepository.updateCategory(
          editingCategory.id,
          categoryForm
        );
      else await categoryRepository.createCategory(categoryForm);
      setCategoryModal(false);
      await loadCategories();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleCategory(category: Category) {
    try {
      await categoryRepository.setCategoryStatus(
        category.id,
        !category.isActive
      );
      await loadCategories();
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return;
    try {
      await categoryRepository.deleteCategory(category.id);
      await loadCategories();
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  }

  async function setMainImage(image: ProductImage) {
    if (!editingProduct || image.isMain) return;
    try {
      await productRepository.setProductMainImage(editingProduct.id, image.id);
      setImages((current) =>
        current.map((item) => ({ ...item, isMain: item.id === image.id }))
      );
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  }

  async function removeImage(image: ProductImage) {
    if (!editingProduct) return;
    if (images.length <= 1) {
      setError("Sản phẩm phải giữ lại ít nhất một ảnh.");
      return;
    }
    try {
      await productRepository.deleteProductImage(editingProduct.id, image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="KHO NÔNG SẢN & VẬT TƯ　›　BẢNG MÃ & DANH MỤC SẢN PHẨM"
        title="Danh Mục & Sản Phẩm Nông Sản"
        description="Quản lý danh mục, SKU, giá, hình ảnh và trạng thái kinh doanh."
        action={
          <button
            onClick={
              tab === "products"
                ? openCreateProduct
                : tab === "categories"
                  ? openCreateCategory
                  : openCreateUnit
            }
            className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Thêm {tab === "products" ? "sản phẩm" : tab === "categories" ? "danh mục" : "đơn vị"}
          </button>
        }
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="mb-4 flex gap-2 border-b border-[#dfe8dd]">
        <button
          onClick={() => setTab("products")}
          className={`px-4 py-3 text-sm font-bold ${tab === "products" ? "border-b-2 border-[#006948] text-[#006948]" : "text-gray-500"}`}
        >
          Sản phẩm
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`px-4 py-3 text-sm font-bold ${tab === "categories" ? "border-b-2 border-[#006948] text-[#006948]" : "text-gray-500"}`}
        >
          Danh mục
        </button>
        <button
          onClick={() => setTab("units")}
          className={`px-4 py-3 text-sm font-bold ${tab === "units" ? "border-b-2 border-[#006948] text-[#006948]" : "text-gray-500"}`}
        >
          Đơn vị
        </button>
      </div>
      {tab === "products" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-[#dfe8dd] bg-white p-3">
            <input
              className="min-w-55 flex-1 rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs"
              placeholder="Tìm theo tên hoặc mã SKU..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <select
              className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </select>
          </div>
          <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
            <div className="mb-3 text-xs text-[#66736a]">
              Danh sách{" "}
              <b className="text-[#006948]">{totalCount}</b>
            </div>
            <DataTable
              headers={[
                "Sản phẩm",
                "Mã SKU",
                "Danh mục",
                "Giá vốn",
                "Giá bán",
                "Trạng thái",
                "Thao tác"
              ]}
            >
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-center" colSpan={7}>
                    Đang tải...
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr className="hover:bg-[#f8fbf7]" key={product.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {product.mainImageUrl && (
                          <Image
                            src={product.mainImageUrl}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-semibold hover:text-[#006948] hover:underline"
                        >
                          {product.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-3">{product.code}</td>
                    <td className="px-3 py-3">
                      <StatusBadge>{product.categoryName}</StatusBadge>
                    </td>
                    <td className="px-3 py-3">
                      {formatCurrency(product.costPrice)}
                    </td>
                    <td className="px-3 py-3">
                      {formatCurrency(product.sellingPrice)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={product.isActive ? "green" : "gray"}>
                        {product.isActive ? "Đang bán" : "Ngừng bán"}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        aria-label={`Chi tiết ${product.name}`}
                        className="inline-flex rounded-lg p-2 text-[#536156] hover:bg-[#eff7ed] hover:text-[#006948]"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>{" "}
                      <IconButton
                        label={`Sửa ${product.name}`}
                        onClick={() => void openEditProduct(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </IconButton>{" "}
                      <IconButton
                        label={`Xóa ${product.name}`}
                        tone="danger"
                        onClick={() => {
                          if (window.confirm(`Xóa sản phẩm "${product.name}"?`))
                            void productRepository
                              .deleteProduct(product.id)
                              .then(() => {
                                const nextPage = products.length === 1 && page > 1 ? page - 1 : page;
                                setPage(nextPage);
                                return loadProducts(query, nextPage, status);
                              })
                              .catch((actionError) =>
                                setError(errorMessage(actionError))
                              );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
            {!loading && totalCount > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#66736a]">
                <span>Trang {page} / {totalPages} · {totalCount} sản phẩm</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-[#dfe8dd] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-lg border border-[#dfe8dd] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : tab === "categories" ? (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          {" "}
          <DataTable
            headers={[
              "Tên danh mục",
              "Danh mục cha",
              "Thứ tự",
              "Trạng thái",
              "Thao tác"
            ]}
          >
            {categoryRows.map(({ category, depth }) => (
                <tr key={category.id} className="hover:bg-[#f8fbf7]">
                  <td className="px-3 py-3">
                    <div className="flex items-center" style={{ paddingLeft: depth * 20 }}>
                      {depth > 0 && <span aria-hidden="true" className="mr-2 text-[#91a399]">↳</span>}
                      <b>{category.name}</b>
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.description}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {category.parentId
                      ? categoryName(category.parentId, categories)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">{category.sortOrder}</td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={category.isActive ? "green" : "gray"}>
                      {category.isActive ? "Đang dùng" : "Tạm khóa"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-3">
                    <IconButton
                      label={`Sửa ${category.name}`}
                      onClick={() => openEditCategory(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`${category.isActive ? "Tắt" : "Bật"} ${category.name}`}
                      onClick={() => void toggleCategory(category)}
                    >
                      {category.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </IconButton>
                    <IconButton
                      label={`Xóa ${category.name}`}
                      tone="danger"
                      onClick={() => void removeCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
          </DataTable>
        </div>
      ) : (
        <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
          <DataTable headers={["Tên đơn vị", "Ký hiệu", "Trạng thái", "Thao tác"]}>
            {units.map((unit) => (
              <tr className="hover:bg-[#f8fbf7]" key={unit.id}>
                <td className="px-3 py-3 font-semibold">{unit.name}</td>
                <td className="px-3 py-3">{unit.symbol ?? unit.abbreviation ?? "—"}</td>
                <td className="px-3 py-3"><StatusBadge>Đang hoạt động</StatusBadge></td>
                <td className="space-x-2 px-3 py-3">
                  <IconButton label={`Sửa ${unit.name}`} onClick={() => openEditUnit(unit)}><Edit className="h-4 w-4" /></IconButton>
                  <IconButton label={`Xóa ${unit.name}`} tone="danger" onClick={() => {
                    if (!window.confirm(`Xóa đơn vị "${unit.name}"?`)) return;
                    void unitRepository.deleteUnit(unit.id)
                      .then(async () => setUnits((await unitRepository.getUnits()).items))
                      .catch((actionError) => setError(errorMessage(actionError)));
                  }}><Trash2 className="h-4 w-4" /></IconButton>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}

      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="relative w-full h-full bg-black/50 p-4 backdrop-blur-sm" onClick={() => setProductModal(false)}></div>
          <form
            onSubmit={submitProduct}
            className="max-h-[90vh] w-full max-w-4xl overflow-y-hidden rounded-2xl bg-white shadow-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {editingProduct ? "Cập nhật thông tin sản phẩm" : "Điền thông tin để tạo sản phẩm"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 px-6 py-5 flex gap-4">
              <div className="w-160 overflow-y-auto h-[70vh] px-2">
                <label className="mb-2 block text-sm font-medium">
                  Gallery ảnh <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((image) => (
                    <div key={image.id} className="relative mb-2">
                      <Image
                        width={200}
                        height={200}
                        src={image.imageUrl}
                        alt=""
                        className={`aspect-square w-full rounded-lg object-cover ${image.isMain ? "ring-2 ring-[#006948]" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => void setMainImage(image)}
                        className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[10px]"
                      >
                        {image.isMain ? "Ảnh chính" : "Chọn chính"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeImage(image)}
                        className="absolute right-1 top-1 rounded bg-red-600 px-1 text-xs text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {newImages.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative mb-2">
                      <Image
                        width={200}
                        height={200}
                        src={URL.createObjectURL(file)}
                        alt=""
                        className={`aspect-square w-full rounded-lg object-cover opacity-70 ${newMainIndex === index ? "ring-2 ring-[#006948]" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setNewMainIndex(index)}
                        className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[10px]"
                      >
                        {newMainIndex === index ? "Ảnh chính" : "Chọn chính"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewImages((current) => current.filter((_, i) => i !== index))}
                        className="absolute right-1 top-1 rounded bg-red-600 px-1 text-xs text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-500 hover:border-[#006948] flex items-center justify-center gap-1">
                  <Plus className="h-4 w-4" /> Thêm nhiều ảnh
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => chooseImages(event.target.files)}
                  />
                </label>
              </div>
              {/* Row 1: SKU + Tên */}
              <div className="flex flex-col gap-4 overflow-y-auto h-[70vh] px-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Mã SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    maxLength={50}
                    value={productForm.code}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        code: event.target.value
                      })
                    }
                    placeholder="VD: SP-001"
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition focus:border-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]/20`}
                  />
                  {/* {fieldErrors.code && <p className="mt-1 text-xs text-red-600">{fieldErrors.code}</p>} */}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tên sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    maxLength={200}
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        name: event.target.value
                      })
                    }
                    placeholder="Nhập tên sản phẩm"
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition focus:border-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]/20`}
                  />
                  {/* {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>} */}
                </div>
              </div>

              {/* Row 2: Danh mục + Đơn vị */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        categoryId: event.target.value
                      })
                    }
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition focus:border-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]/20`}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {/* {fieldErrors.categoryId && <p className="mt-1 text-xs text-red-600">{fieldErrors.categoryId}</p>} */}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Đơn vị <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={productForm.unitId}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        unitId: event.target.value
                      })
                    }
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition focus:border-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]/20`}
                  >
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                  {/* {fieldErrors.unitId && <p className="mt-1 text-xs text-red-600">{fieldErrors.unitId}</p>} */}
                </div>
              </div>

              {/* Row 3: Giá + Tồn kho */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["costPrice", "Giá vốn", false],
                    ["sellingPrice", "Giá bán", true],
                    ["minStockAlert", "Cảnh báo tồn", false],
                    ["expiryDays", "Hạn dùng (ngày)", false],
                  ] as const
                ).map(([key, label, isRequired]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      {label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      required={isRequired}
                      min={key === "sellingPrice" ? 1 : 0}
                      type="number"
                      value={productForm[key] ?? ""}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          [key]: e.target.value === "" ? undefined : Number(e.target.value)
                        })
                      }
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition focus:border-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]/20`}
                    />
                    {/* {fieldErrors[key] && <p className="mt-1 text-xs text-red-600">{fieldErrors[key]}</p>} */}
                  </div>
                ))}
              </div>

              {/* Mô tả ngắn */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Mô tả ngắn
                </label>
                <input
                  value={productForm.shortDescription}
                  onChange={(e) => setProductForm({ ...productForm, shortDescription: e.target.value })}
                  placeholder="Mô tả ngắn gọn về sản phẩm..."
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm transition focus:border-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                />
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  placeholder="Nhập mô tả đầy đủ về sản phẩm..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm transition focus:border-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]/20"
                />
              </div>

              {/* Switches */}
              <div className="flex flex-wrap gap-8 pt-1">
                {/* Đang bán */}
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={productForm.isActive}
                      onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-[#006948] peer-focus:ring-4 peer-focus:ring-[#006948]/20"></div>
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Đang bán</span>
                </label>

                {/* Sản phẩm nổi bật */}
                <label className="flex cursor-pointer items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={productForm.isFeatured}
                      onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-[#006948] peer-focus:ring-4 peer-focus:ring-[#006948]/20"></div>
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Sản phẩm nổi bật</span>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setProductModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                // disabled={!formIsValid || submitting}
                className="rounded-lg bg-[#006948] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00553a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : editingProduct ? "Cập nhật sản phẩm" : "Lưu sản phẩm"}
              </button>
            </div>
          </form>
        </div>
      )}

      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitCategory}
            className="w-full max-w-lg rounded-2xl bg-white p-6"
          >
            <div className="mb-5 flex justify-between">
              <h2 className="text-xl font-bold">
                {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
              </h2>
              <button
                type="button"
                onClick={() => setCategoryModal(false)}
                className="text-2xl text-gray-400"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                required
                maxLength={200}
                placeholder="Tên danh mục *"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm({ ...categoryForm, name: event.target.value })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                placeholder="Mô tả"
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: event.target.value
                  })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <select
                value={categoryForm.parentId ?? ""}
                onChange={(event) =>
                  setCategoryForm({
                    ...categoryForm,
                    parentId: event.target.value || null
                  })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Không có danh mục cha</option>
                {categories
                  .filter((item) =>
                    item.id !== editingCategory?.id &&
                    !excludedCategoryParents.has(item.id)
                  )
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min={0}
                placeholder="Thứ tự"
                value={categoryForm.sortOrder}
                onChange={(event) =>
                  setCategoryForm({
                    ...categoryForm,
                    sortOrder: Number(event.target.value)
                  })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <label className="text-sm">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      isActive: event.target.checked
                    })
                  }
                />{" "}
                Đang sử dụng
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setCategoryModal(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                disabled={submitting}
                className="rounded-lg bg-[#006948] px-4 py-2 text-sm font-bold text-white"
              >
                Lưu danh mục
              </button>
            </div>
          </form>
        </div>
      )}
      {unitModal && (
        <AdminModal
          title={editingUnit ? "Sửa đơn vị" : "Thêm đơn vị"}
          description="Đơn vị được dùng trong sản phẩm và bán hàng tại quầy."
          onClose={() => setUnitModal(false)}
          footer={
            <>
              <button type="button" className="rounded-lg border px-4 py-2 text-xs" onClick={() => setUnitModal(false)}>Hủy</button>
              <button form="unit-form" disabled={submitting} className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{submitting ? "Đang lưu..." : "Lưu đơn vị"}</button>
            </>
          }
        >
          <form id="unit-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submitUnit(event)}>
            <label className="text-xs">Tên đơn vị<input required className="mt-1 w-full rounded-lg border p-3" value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} /></label>
            <label className="text-xs">Ký hiệu<input required className="mt-1 w-full rounded-lg border p-3" value={unitForm.symbol} onChange={(event) => setUnitForm({ ...unitForm, symbol: event.target.value })} /></label>
            <label className="text-xs sm:col-span-2">Mô tả<textarea className="mt-1 w-full rounded-lg border p-3" rows={3} value={unitForm.description} onChange={(event) => setUnitForm({ ...unitForm, description: event.target.value })} /></label>
          </form>
        </AdminModal>
      )}
    </>
  );
}