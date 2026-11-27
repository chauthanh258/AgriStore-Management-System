# AgriStore - API template cho frontend

> Tài liệu này là contract tham chiếu để thiết kế màn hình, state và component
> frontend dựa trên các API hiện có trong `Backend/AgriStore.Api`.
>
> Base URL khi chạy local thường là `http://localhost:5274`. Các giá trị
> `00000000-0000-0000-0000-000000000000` trong ví dụ chỉ là UUID mẫu.

## 1. Quy ước chung

### Request và response

- Header JSON: `Content-Type: application/json`.
- Endpoint upload ảnh sản phẩm dùng `multipart/form-data` với field file là
  `file`.
- Ngày giờ trả về ở dạng ISO 8601, ví dụ `2026-10-17T13:26:33Z`.
- Tiền và số lượng trả về là số JSON, không phải chuỗi. Frontend tự định dạng
  tiền theo locale nhưng không làm tròn giá trị trước khi gửi lại API.
- Các endpoint xóa hoặc đặt địa chỉ mặc định thành công trả về `204 No Content`
  và không có JSON body.

### Response danh sách có phân trang

Các module sản phẩm, danh mục, đơn vị, nhà cung cấp, khách hàng, tồn kho,
đơn hàng, giao dịch kho và user dùng shape sau:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0,
  "totalPages": 0
}
```

Frontend nên giữ `page`, `pageSize`, `totalCount`, `totalPages` trong state
phân trang. `pageSize` mặc định là `20`; các API tồn kho và giao dịch kho giới
hạn `pageSize` tối đa là `100`.

### Lỗi

Lỗi nghiệp vụ thường có dạng `ProblemDetails`:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Không thể hoàn tất yêu cầu.",
  "status": 400,
  "detail": "Nội dung lỗi hiển thị cho người dùng.",
  "instance": "/api/products"
}
```

Lỗi validation của ASP.NET Core có thể có thêm `errors`:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Name": ["The Name field is required."]
  }
}
```

Frontend cần xử lý tối thiểu các mã `400`, `401`, `403`, `404`, `409` và
`500`. Khi nhận `401`, thử `POST /api/auth/refresh` một lần; nếu refresh thất
bại thì xóa session và chuyển về màn hình đăng nhập.

## 2. Xác thực và tài khoản

### Đăng ký - `POST /api/auth/register`

```json
// request
{
  "fullName": "Nguyễn Văn A",
  "email": "customer@example.com",
  "phoneNumber": "0900000000",
  "password": "Password123"
}

// 201 response
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "email": "customer@example.com",
  "fullName": "Nguyễn Văn A",
  "roles": ["Customer"]
}
```

### Đăng nhập - `POST /api/auth/login`

```json
// request
{ "email": "admin@agristore.local", "password": "AgriStore123" }

// 200 response
{
  "accessToken": "<jwt>",
  "accessTokenExpiresAt": "2026-10-17T14:26:33Z",
  "userId": "00000000-0000-0000-0000-000000000001",
  "email": "admin@agristore.local",
  "fullName": "Admin",
  "roles": ["Admin"]
}
```

API đồng thời đặt refresh token vào cookie `HttpOnly`, vì vậy frontend không
đọc refresh token từ JSON. Gửi cookie khi gọi API bằng `credentials: "include"`
(hoặc `withCredentials: true`).

| Endpoint | Body | Thành công |
| --- | --- | --- |
| `POST /api/auth/refresh` | Không có | `AuthResponse` |
| `POST /api/auth/logout` | Không có | `204` |
| `POST /api/auth/change-password` | `{ currentPassword, newPassword }` | `{ message, resetToken? }` |
| `POST /api/auth/forgot-password` | `{ email }` | `{ message, resetToken? }` |
| `POST /api/auth/reset-password` | `{ email, token, newPassword }` | `{ message, resetToken? }` |

## 3. Catalog và sản phẩm

### Danh mục - `/api/categories`

| Method | Endpoint | Body/query | Response |
| --- | --- | --- | --- |
| GET | `/api/categories` | `page`, `pageSize`, `search`, `parentId`, `isActive` | `CategoryListResponse` |
| GET | `/api/categories/{id}` | - | `CategoryResponse` |
| POST | `/api/categories` | `CreateCategoryRequest` | `CategoryResponse` |
| PUT | `/api/categories/{id}` | `UpdateCategoryRequest` | `CategoryResponse` |
| PATCH | `/api/categories/{id}/status` | `{ "isActive": true }` | `CategoryResponse` |
| DELETE | `/api/categories/{id}` | - | `204` |

```json
{
  "id": "00000000-0000-0000-0000-000000000010",
  "name": "Rau củ",
  "description": "Rau củ tươi",
  "parentId": null,
  "image": "/uploads/categories/rau-cu.jpg",
  "isActive": true,
  "sortOrder": 1
}
```

### Đơn vị - `/api/units`

| Method | Endpoint | Body/query | Response |
| --- | --- | --- | --- |
| GET | `/api/units` | `page`, `pageSize`, `search` | `UnitListResponse` |
| GET | `/api/units/{id}` | - | `UnitResponse` |
| POST | `/api/units` | `{ name, symbol, description }` | `UnitResponse` |
| PUT | `/api/units/{id}` | `{ name, symbol, description }` | `UnitResponse` |
| DELETE | `/api/units/{id}` | - | `204` |

### Sản phẩm - `/api/products`

Query của `GET /api/products`:
`page`, `pageSize`, `search`, `categoryId`, `isActive`, `unitId`,
`minPrice`, `maxPrice`, `isFeatured`, `sortBy`, `sortDirection`.
`sortBy` là `name`, `code`, `sellingPrice` hoặc `createdAt`; `sortDirection`
là `asc` hoặc `desc`.

```json
// ProductListResponse
{
  "items": [
    {
      "id": "00000000-0000-0000-0000-000000000020",
      "code": "RAU-001",
      "name": "Cải xanh",
      "categoryId": "00000000-0000-0000-0000-000000000010",
      "categoryName": "Rau củ",
      "unitId": "00000000-0000-0000-0000-000000000011",
      "unitName": "Kilogram",
      "description": "Cải xanh hữu cơ",
      "shortDescription": "Cải xanh tươi",
      "costPrice": 18000,
      "sellingPrice": 25000,
      "minStockAlert": 10,
      "expiryDays": 3,
      "isActive": true,
      "isFeatured": true,
      "createdAt": "2026-10-17T08:00:00Z",
      "updatedAt": null,
      "mainImageUrl": "/uploads/products/cai-xanh.jpg"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1,
  "totalPages": 1
}
```

`GET /api/products/{id}` trả về product chi tiết giống item trên nhưng thay
`mainImageUrl` bằng `images`:

```json
"images": [
  {
    "id": "00000000-0000-0000-0000-000000000021",
    "imageUrl": "/uploads/products/cai-xanh.jpg",
    "isMain": true,
    "sortOrder": 0
  }
]
```

Các thao tác còn lại:

| Method | Endpoint | Body/form | Response |
| --- | --- | --- | --- |
| POST | `/api/products` | `CreateProductRequest` | `ProductResponse` |
| PUT | `/api/products/{id}` | `UpdateProductRequest` | `ProductResponse` |
| PATCH | `/api/products/{id}/status` | `{ "isActive": true }` | `ProductResponse` |
| DELETE | `/api/products/{id}` | - | `204` |
| POST | `/api/products/{id}/images` | multipart field `file` | `ProductImageResponse` |
| PATCH | `/api/products/{id}/images/{imageId}/main` | - | `ProductImageResponse` |
| DELETE | `/api/products/{id}/images/{imageId}` | - | `204` |

Request tạo/cập nhật sản phẩm gồm:
`code`, `name`, `categoryId`, `unitId`, `description`, `shortDescription`,
`costPrice`, `sellingPrice`, `minStockAlert`, `expiryDays`, `isActive`,
`isFeatured`.

## 4. Kho và nhập hàng

### Kho - `/api/warehouses`

| Method | Endpoint | Response |
| --- | --- | --- |
| GET | `/api/warehouses` | `WarehouseResponse[]` |
| GET | `/api/warehouses/{id}` | `WarehouseResponse` |
| POST | `/api/warehouses` | `WarehouseResponse` |
| PUT | `/api/warehouses/{id}` | `WarehouseResponse` |
| DELETE | `/api/warehouses/{id}` | `204` |

```json
{
  "id": "00000000-0000-0000-0000-000000000030",
  "name": "Kho trung tâm",
  "address": "Hà Nội",
  "phone": "0900000000",
  "isDefault": true,
  "isActive": true
}
```

### Tồn kho - `/api/inventories`

| Method | Endpoint | Query | Response |
| --- | --- | --- | --- |
| GET | `/api/inventories` | `productId`, `warehouseId`, `page`, `pageSize` | `InventoryListResponse` |
| GET | `/api/inventories/low-stock` | `warehouseId`, `page`, `pageSize` | `InventoryListResponse` |

Mỗi `InventoryItemResponse` có:
`productId`, `productCode`, `productName`, `warehouseId`, `warehouseName`,
`quantity`, `reservedQuantity`, `availableQuantity`, `minStockAlert`,
`isLowStock`.

### Giao dịch kho - `/api/stock-transactions`

| Method | Endpoint | Body/query | Response |
| --- | --- | --- | --- |
| GET | `/api/stock-transactions` | `transactionType`, `productId`, `warehouseId`, `referenceType`, `referenceId`, `fromDate`, `toDate`, `page`, `pageSize` | `StockTransactionListResponse` |
| GET | `/api/stock-transactions/{batchId}` | - | `StockTransactionResponse` |
| POST | `/api/stock-transactions` | `CreateStockTransactionRequest` | `StockTransactionResponse` |

`transactionType` chỉ nhận `Import`, `Export`, `Count`, `Adjust`. Một line
giao dịch gồm `productId` và một hoặc nhiều giá trị phù hợp trong
`quantity`, `adjustment`, `countedQuantity`.

### Đơn nhập hàng - `/api/purchase-orders`

| Method | Endpoint | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/purchase-orders/{id}` | - | `PurchaseOrderResponse` |
| POST | `/api/purchase-orders` | `PurchaseOrderRequest` | `PurchaseOrderResponse` |
| PUT | `/api/purchase-orders/{id}` | `PurchaseOrderRequest` | `PurchaseOrderResponse` |
| POST | `/api/purchase-orders/{id}/details` | `{ productId, quantity, unitPrice }` | `PurchaseOrderResponse` |
| DELETE | `/api/purchase-orders/{id}/details/{detailId}` | - | `PurchaseOrderResponse` |
| POST | `/api/purchase-orders/{id}/order` | - | `PurchaseOrderResponse` |
| POST | `/api/purchase-orders/{id}/receive` | `{ details: [{ productId, receivedQuantity }] }` | `PurchaseOrderResponse` |

Các trạng thái đơn nhập hàng được trả về ở field `status`; frontend nên hiển
thị nguyên văn giá trị chưa biết thay vì làm hỏng màn hình khi backend bổ sung
trạng thái mới.

## 5. Bán hàng và khách hàng

### Đơn hàng - `/api/orders`

Query `GET /api/orders`: `page`, `pageSize`, `search`, `status`, `customerId`,
`fromDate`, `toDate`.

```json
// CreateOnlineOrderRequest
{
  "customerId": "00000000-0000-0000-0000-000000000040",
  "shippingAddressId": "00000000-0000-0000-0000-000000000041",
  "shippingMethodId": "00000000-0000-0000-0000-000000000042",
  "warehouseId": "00000000-0000-0000-0000-000000000030",
  "note": "Giao trong giờ hành chính",
  "items": [
    {
      "productId": "00000000-0000-0000-0000-000000000020",
      "quantity": 2
    }
  ]
}
```

| Method | Endpoint | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/orders` | query phân trang | `OrderListResponse` |
| GET | `/api/orders/{id}` | - | `OrderResponse` |
| POST | `/api/orders/pos` | `CreatePosOrderRequest` | `OrderResponse` |
| POST | `/api/orders/online` | `CreateOnlineOrderRequest` | `OrderResponse` |
| PUT | `/api/orders/{id}` | `UpdateOrderRequest` | `OrderResponse` |
| PATCH | `/api/orders/{id}/status` | `{ "status": "..." }` | `OrderResponse` |
| POST | `/api/orders/{id}/coupon` | `{ "code": "..." }` | `OrderResponse` |

`OrderResponse` gồm `id`, `code`, `warehouseId`, `customerId`, `userId`,
`orderDate`, `status`, `shippingAddressId`, `shippingMethodId`, `subTotal`,
`discountAmount`, `shippingFee`, `totalAmount`, `note`, `couponId` và
`details`. Mỗi detail gồm `productId`, `productCode`, `productName`,
`quantity`, `unitPrice`, `discount`, `totalPrice`.

### Khách hàng - `/api/customers`

| Method | Endpoint | Body/query | Response |
| --- | --- | --- | --- |
| GET | `/api/customers` | `page`, `pageSize`, `search` | `CustomerListResponse` |
| GET | `/api/customers/addresses` | `page`, `pageSize`, `search` | `AddressBookResponse` |
| GET | `/api/customers/{id}` | - | `CustomerResponse` |
| POST | `/api/customers` | `fullName`, `phone`, `email`, `gender`, `dateOfBirth`, `notes` | `CustomerResponse` |
| PUT | `/api/customers/{id}` | các field trên | `CustomerResponse` |
| DELETE | `/api/customers/{id}` | - | `204` |
| GET | `/api/customers/{customerId}/addresses` | - | `AddressResponse[]` |
| POST | `/api/customers/{customerId}/addresses` | thông tin địa chỉ | `AddressResponse` |
| PUT | `/api/customers/{customerId}/addresses/{addressId}` | thông tin địa chỉ | `AddressResponse` |
| PATCH | `/api/customers/{customerId}/addresses/{addressId}/default` | - | `204` |
| DELETE | `/api/customers/{customerId}/addresses/{addressId}` | - | `204` |

Customer có `id`, `fullName`, `phone`, `email`, `gender`, `dateOfBirth`,
`loyaltyPoints`, `notes`, `addresses`. Địa chỉ có `receiverName`, `phone`,
`province`, `district`, `ward`, `detailAddress`, `isDefault`.

`GET /api/customers/addresses` là danh sách địa chỉ dùng cho màn hình quản trị,
khác với danh sách địa chỉ lồng trong một customer:

```json
{
  "items": [
    {
      "id": "00000000-0000-0000-0000-000000000041",
      "customerId": "00000000-0000-0000-0000-000000000040",
      "customerName": "Nguyễn Văn A",
      "receiverName": "Nguyễn Văn A",
      "phone": "0900000000",
      "province": "Hà Nội",
      "district": "Cầu Giấy",
      "ward": "Dịch Vọng",
      "detailAddress": "Số 1 đường ABC",
      "isDefault": true
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1,
  "totalPages": 1
}
```

### Thanh toán đơn hàng - `/api/orders/{orderId}/payment`

Các endpoint này yêu cầu policy `ManageOperations` (Admin, Manager hoặc Staff).

| Method | Endpoint | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/orders/{orderId}/payment` | - | `PaymentResponse` |
| POST | `/api/orders/{orderId}/payment` | `CreatePaymentRequest` | `PaymentResponse` |
| PATCH | `/api/orders/{orderId}/payment/status` | `UpdatePaymentStatusRequest` | `PaymentResponse` |

```json
// CreatePaymentRequest
{
  "paymentMethod": "Cash",
  "transactionCode": null,
  "notes": "Thu tiền tại quầy"
}

// PaymentResponse
{
  "id": "00000000-0000-0000-0000-000000000050",
  "orderId": "00000000-0000-0000-0000-000000000051",
  "paymentMethod": "Cash",
  "amount": 125000,
  "status": "Paid",
  "transactionCode": null,
  "paidAt": "2026-10-29T04:09:58Z",
  "notes": "Thu tiền tại quầy"
}
```

`paymentMethod` nhận `Cash`, `BankTransfer` hoặc `CashOnDelivery`.
`status` nhận `Pending`, `Paid`, `Failed` hoặc `Refunded`. Cập nhật trạng thái
dùng body `{ "status": "Paid", "notes": "..." }`.

### Giao hàng - `/api/orders/{orderId}/delivery`

Các endpoint này cũng yêu cầu policy `ManageOperations`.

| Method | Endpoint | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/orders/{orderId}/delivery` | - | `DeliveryResponse` |
| POST | `/api/orders/{orderId}/delivery` | `CreateDeliveryRequest` | `DeliveryResponse` |
| PATCH | `/api/orders/{orderId}/delivery/status` | `UpdateDeliveryStatusRequest` | `DeliveryResponse` |

```json
// CreateDeliveryRequest
{
  "trackingCode": "AGRI-000051",
  "shipperName": "Trần Văn B",
  "shipperPhone": "0911111111",
  "notes": null
}

// DeliveryResponse
{
  "id": "00000000-0000-0000-0000-000000000060",
  "orderId": "00000000-0000-0000-0000-000000000051",
  "trackingCode": "AGRI-000051",
  "shipperName": "Trần Văn B",
  "shipperPhone": "0911111111",
  "status": "Shipped",
  "shippedAt": "2026-10-29T04:30:00Z",
  "deliveredAt": null,
  "notes": null
}
```

`status` giao hàng nhận `Preparing`, `Shipped`, `Delivered` hoặc `Failed`.
Cập nhật trạng thái dùng body `{ "status": "Delivered", "notes": "..." }`.

### Đánh giá sản phẩm

#### Danh sách và tạo đánh giá

| Method | Endpoint | Body/query | Quyền | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/products/{productId}/reviews` | `page`, `pageSize`, `includePending` | Public; `includePending=true` cần Admin/Manager | `ProductReviewListResponse` |
| POST | `/api/products/{productId}/reviews` | `{ "rating": 5, "comment": "Rất tươi" }` | Customer | `ProductReviewResponse` |

`rating` là số nguyên từ `1` đến `5`, `comment` không bắt buộc và tối đa 2000
ký tự. Response danh sách có phân trang chuẩn của tài liệu:

```json
{
  "items": [
    {
      "id": "00000000-0000-0000-0000-000000000070",
      "productId": "00000000-0000-0000-0000-000000000020",
      "customerName": "Nguyễn Văn A",
      "rating": 5,
      "comment": "Rất tươi",
      "isApproved": true,
      "createdAt": "2026-10-29T04:09:58Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1,
  "totalPages": 1
}
```

#### Duyệt và xóa đánh giá

| Method | Endpoint | Body | Quyền | Response |
| --- | --- | --- | --- | --- |
| PATCH | `/api/product-reviews/{reviewId}/approval` | `{ "isApproved": true }` | `ManageCatalog` (Admin/Manager) | `ProductReviewResponse` |
| DELETE | `/api/product-reviews/{reviewId}` | - | Người tạo đánh giá hoặc Admin/Manager | `204` |

Khi `includePending=false` (mặc định), frontend cửa hàng chỉ nên hiển thị các
đánh giá đã được duyệt.

## 6. Báo cáo - `/api/reports`

Các endpoint báo cáo yêu cầu policy `ManageOperations` (Admin, Manager hoặc
Staff).

### Doanh thu - `GET /api/reports/revenue`

Query: `fromDate`, `toDate` dạng `YYYY-MM-DD` và `groupBy` là `day` hoặc
`month`.

```json
{
  "groupBy": "day",
  "fromDate": "2026-10-01",
  "toDate": "2026-10-29",
  "totalRevenue": 12500000,
  "paidOrderCount": 85,
  "periods": [
    {
      "period": "2026-10-29",
      "revenue": 500000,
      "paidOrderCount": 4
    }
  ]
}
```

### Sản phẩm bán chạy - `GET /api/reports/top-selling-products`

Query: `fromDate`, `toDate`, `limit` (từ `1` đến `100`, mặc định `10`).

```json
[
  {
    "productId": "00000000-0000-0000-0000-000000000020",
    "productCode": "RAU-001",
    "productName": "Cải xanh",
    "quantitySold": 120,
    "revenue": 3000000
  }
]
```

### Báo cáo tồn kho - `GET /api/reports/inventory`

Query: `warehouseId`, `lowStockOnly` (mặc định `false`). Response là một
array `InventoryReportItemResponse`, mỗi item gồm:
`productId`, `productCode`, `productName`, `warehouseId`, `warehouseName`,
`quantity`, `reservedQuantity`, `availableQuantity`, `minStockAlert`,
`isLowStock`.

## 7. Quản trị user và role

### User - `/api/users`

| Method | Endpoint | Body/query | Response |
| --- | --- | --- | --- |
| GET | `/api/users` | `page`, `pageSize`, `search`, `isActive` | `UserListResponse` |
| GET | `/api/users/{id}` | - | `UserResponse` |
| PUT | `/api/users/{id}` | `fullName`, `email`, `phoneNumber`, `avatar`, `roles?` | `UserResponse` |
| PATCH | `/api/users/{id}/status` | `{ "isActive": true }` | `UserResponse` |
| GET | `/api/users/{id}/roles` | - | `{ userId, roles: [] }` |
| PUT | `/api/users/{id}/roles` | `{ "roles": ["Staff"] }` | `{ userId, roles: [] }` |
| POST | `/api/users/{id}/roles/{roleName}` | - | `{ userId, roles: [] }` |
| DELETE | `/api/users/{id}/roles/{roleName}` | - | `{ userId, roles: [] }` |

### Role - `/api/roles`

| Method | Endpoint | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/roles` | - | `RoleResponse[]` |
| GET | `/api/roles/{id}` | - | `RoleResponse` |
| POST | `/api/roles` | `{ name, description }` | `RoleResponse` |
| PUT | `/api/roles/{id}` | `{ name, description }` | `RoleResponse` |
| DELETE | `/api/roles/{id}` | - | `204` |

`RoleResponse` gồm `id`, `name`, `description`, `createdAt`, `userCount`,
`isSystemRole`. Role hệ thống không nên cho phép frontend hiển thị nút sửa/xóa.

## 8. Mapping màn hình frontend đề xuất

| Màn hình | API chính | Dữ liệu cần hiển thị |
| --- | --- | --- |
| Đăng nhập/đăng ký | `/api/auth/*` | email, mật khẩu, lỗi field, roles |
| Dashboard kho | `/api/inventories`, `/api/inventories/low-stock` | tồn khả dụng, hàng sắp hết, kho |
| Danh mục/sản phẩm | `/api/categories`, `/api/units`, `/api/products` | filter, bảng sản phẩm, giá, ảnh, trạng thái |
| Quản lý kho | `/api/warehouses`, `/api/stock-transactions` | kho, loại giao dịch, số lượng trước/sau |
| Nhập hàng | `/api/purchase-orders`, `/api/suppliers` | nhà cung cấp, chi tiết nhập, đã nhận |
| Bán hàng POS | `/api/orders/pos`, `/api/customers`, `/api/products` | giỏ hàng, khách, tổng tiền, thanh toán |
| Đơn online | `/api/orders/online`, `/api/customers/{id}/addresses` | địa chỉ, vận chuyển, trạng thái |
| Thanh toán/giao hàng | `/api/orders/{id}/payment`, `/api/orders/{id}/delivery` | phương thức, trạng thái, mã vận đơn |
| Đánh giá sản phẩm | `/api/products/{id}/reviews`, `/api/product-reviews/{id}/approval` | sao, bình luận, duyệt |
| Dashboard/báo cáo | `/api/reports/*` | doanh thu, đơn đã trả, bán chạy, tồn kho |
| Khách hàng | `/api/customers` | điểm tích lũy, địa chỉ, lịch sử đơn |
| Quản trị tài khoản | `/api/users`, `/api/roles` | role, trạng thái, phân quyền |

## 9. Lưu ý khi triển khai frontend

1. Không hard-code `id` của sản phẩm, kho, danh mục hoặc khách hàng; luôn lấy
   từ API và lưu UUID.
2. Các field nullable (`description`, `email`, `avatar`, `notes`,
   `dateOfBirth`, các ID liên quan) cần có trạng thái hiển thị khi giá trị là
   `null`.
3. Sau các thao tác `POST`, `PUT`, `PATCH`, dùng object trong response để cập
   nhật cache thay vì tự dựng lại object.
4. Sau `DELETE` hoặc response `204`, cập nhật danh sách cục bộ và không cố đọc
   JSON body.
5. Backend hiện đã bật authorization cho customer management, payment,
   delivery, reports và product reviews theo từng policy/role. Frontend phải
   gửi `Authorization: Bearer <accessToken>` và ẩn các chức năng theo role.
6. Swagger tại `/swagger` là nguồn kiểm tra cuối cùng khi backend thay đổi
   DTO hoặc status code.
