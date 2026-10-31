"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  categories as mockCategories,
  products as mockProducts
} from "../../../data/mock";
import { categoryRepository } from "../../../services/categories/category.repository";
import { productRepository } from "../../../services/products/product.repository";
import { getUnits } from "../../../services/units/unit.service";
import type {
  Category,
  CategoryRequest,
  Product,
  ProductImage,
  ProductRequest,
  Unit
} from "../../../types/api";
import { formatCurrency } from "../../../lib/formatters";
import {
  DataTable,
  PageHeader,
  StatusBadge
} from "../../../components/admin/admin-ui";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
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

export default function ProductsAdminPage() {
  const [tab, setTab] = useState<"categories" | "products">("products");
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [productForm, setProductForm] = useState<ProductRequest>(emptyProduct);
  const [categoryForm, setCategoryForm] =
    useState<CategoryRequest>(emptyCategory);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newMainIndex, setNewMainIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(async (search = "") => {
    setLoading(true);
    try {
      setProducts(
        (
          await productRepository.getProducts({
            page: 1,
            pageSize: 100,
            search
          })
        ).items
      );
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
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
      void loadProducts();
      void loadCategories();
      if (!useMock)
        void getUnits()
          .then((result) => setUnits(result.items))
          .catch((loadError) => setError(errorMessage(loadError)));
      else
        setUnits(
          Array.from(
            new Map(
              mockProducts.map((item) => [
                item.unitId,
                { id: item.unitId, name: item.unitName, isActive: true }
              ])
            ).values()
          )
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts, loadCategories]);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          status === "all" ||
          (status === "active" ? item.isActive : !item.isActive)
      ),
    [products, status]
  );

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
      await loadProducts();
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
              tab === "products" ? openCreateProduct : openCreateCategory
            }
            className="rounded-lg bg-[#006948] px-4 py-2 text-xs font-bold text-white"
          >
            ＋ Thêm {tab === "products" ? "sản phẩm" : "danh mục"}
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
      </div>
      {tab === "products" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-[#dfe8dd] bg-white p-3">
            <input
              className="min-w-[220px] flex-1 rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs"
              placeholder="Tìm theo tên hoặc mã SKU..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                void loadProducts(event.target.value);
              }}
            />
            <select
              className="rounded-lg border border-[#dfe8dd] px-3 py-2 text-xs"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </select>
          </div>
          <div className="rounded-xl border border-[#dfe8dd] bg-white p-4">
            <div className="mb-3 text-xs text-[#66736a]">
              Danh sách{" "}
              <b className="text-[#006948]">{filteredProducts.length}</b>
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
                filteredProducts.map((product) => (
                  <tr className="hover:bg-[#f8fbf7]" key={product.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {product.mainImageUrl && (
                          <img
                            src={product.mainImageUrl}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <b>{product.name}</b>
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
                      <button
                        className="mr-2 text-[#006948] hover:underline"
                        onClick={() => void openEditProduct(product)}
                      >
                        Sửa
                      </button>{" "}
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => {
                          if (window.confirm(`Xóa sản phẩm "${product.name}"?`))
                            void productRepository
                              .deleteProduct(product.id)
                              .then(() => loadProducts())
                              .catch((actionError) =>
                                setError(errorMessage(actionError))
                              );
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </div>
        </>
      ) : (
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
            {[...categories]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((category) => (
                <tr key={category.id} className="hover:bg-[#f8fbf7]">
                  <td className="px-3 py-3">
                    <b>{category.name}</b>
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
                    <button
                      className="mr-2 text-[#006948] hover:underline"
                      onClick={() => openEditCategory(category)}
                    >
                      Sửa
                    </button>
                    <button
                      className="mr-2 text-amber-700 hover:underline"
                      onClick={() => void toggleCategory(category)}
                    >
                      {category.isActive ? "Tắt" : "Bật"}
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => void removeCategory(category)}
                    >
                      Xóa
                    </button>
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
                <span className="text-2xl leading-none">×</span>
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
                      <img
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
                        ×
                      </button>
                    </div>
                  ))}
                  {newImages.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative mb-2">
                      <img
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
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <label className="block cursor-pointer rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-500 hover:border-[#006948]">
                  ＋ Thêm nhiều ảnh
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
                      min={key === "sellingPrice" ? 0.01 : 0}
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
                ×
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
                  .filter((item) => item.id !== editingCategory?.id)
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
    </>
  );
}