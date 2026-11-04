# Kế hoạch triển khai hoàn thiện giao diện Admin AgriStore

## 1. Phạm vi và cơ sở đối chiếu

Tài liệu này đối chiếu:

- `plans/PRD_v2.md` (PRD/UI architecture phiên bản hợp nhất).
- `plans/PRD.md` (PRD chức năng và acceptance criteria).
- Các route Admin trong `Frontend/app/admin`.
- Shared UI trong `Frontend/components/admin`.
- Service, repository, type và mock data hiện có trong `Frontend/services`, `Frontend/types`, `Frontend/data`.

Phạm vi triển khai giữ nguyên Next.js App Router, TypeScript, Tailwind CSS, Recharts và logic/API hiện có. Không thêm nghiệp vụ ngoài PRD, không hoàn tác hoặc chỉnh sửa các thay đổi đang có ở Backend và storefront ngoài phạm vi Admin.

> **Design system:** workspace không có skill UI UX Pro Max riêng. Kế hoạch áp dụng tương đương trên Tailwind/component hiện có: màu xanh AgriStore và mint, typography phân cấp rõ, spacing nhất quán, trạng thái loading/empty/error/success, icon action có tooltip/aria-label, responsive desktop/tablet/mobile.

## 2. Đánh giá hiện trạng theo trang

| Trang | Hiện trạng | Thiếu/cần cải thiện theo PRD | Mức ưu tiên |
|---|---|---|---|
| `/admin/dashboard` | Có KPI, biểu đồ doanh thu, top sản phẩm, đơn chờ bằng mock data | Bổ sung phân tách POS/Online, tiến độ liên kho, trạng thái loading/error/empty và link xử lý cảnh báo | P1 |
| `/admin/pos` | Có chọn sản phẩm, giỏ hàng, voucher và nút thanh toán; dữ liệu khách đang chọn từ select | Tìm khách bằng số điện thoại, cho phép guest, quản lý nhiều đơn chờ, action tăng/giảm/xóa dòng, loại bỏ hoàn toàn quét barcode, feedback thanh toán và kiểm tra tồn khả dụng | P0 |
| `/admin/products` | Có tab Product/Category, CRUD Category/Product, upload ảnh, chọn Unit trong form | Thêm tab Unit và modal CRUD; đổi action text Sửa/Xóa thành icon; chuẩn hóa tab/filter/modal; hiển thị giá vốn, biên lợi nhuận, kho và tiêu chuẩn canh tác | P0 |
| `/admin/orders` | Dùng `ResourcePage`, có tìm kiếm cơ bản và badge trạng thái | Tab/trạng thái đơn POS-Online, detail modal, cập nhật trạng thái giao hàng/thanh toán, xem chi tiết và hủy theo quyền | P1 |
| `/admin/inventory` | Có KPI và danh sách tồn một kho, cảnh báo thấp | Chọn nhiều kho, tách tồn thực tế/giữ đơn/khả dụng, FIFO/date <48h, modal giao dịch Nhập/Xuất/Điều chỉnh/Chuyển, lịch sử và chặn tồn âm | P1 |
| `/admin/purchase-orders` | Có danh sách PO mock qua `ResourcePage` | Tab NCC/PO, CRUD NCC, modal tạo/sửa PO và chi tiết sản phẩm, workflow nghiệm thu 4 bước, duyệt mới cộng tồn, in phiếu | P1 |
| `/admin/customers` | Có danh sách khách, hạng và điểm mock | Detail modal, lịch sử đơn/địa chỉ/LTV/khẩu vị, điều chỉnh điểm theo quyền, phân nhóm khách hàng và tìm kiếm/lọc thực | P2 |
| `/admin/reviews` | Có filter, danh sách/detail, duyệt/từ chối cục bộ | Sửa bulk approve đang không thực hiện tác vụ; thêm khóa vi phạm, phản hồi khách, filter tìm kiếm thực, trạng thái API/error | P2 |
| `/admin/vouchers` | Có danh sách voucher mock | Modal tạo/sửa, preview card, flash sale, điều kiện min order/mức giảm tối đa, guardrail không cộng dồn và giới hạn lượt dùng | P2 |
| `/admin/reports` | Có KPI, chart, bộ lọc ngày và bảng top sản phẩm | Tab doanh thu/tồn kho/đơn hàng, chart lợi nhuận và phương thức thanh toán, inventory turnover/hao hụt, export có feedback | P2 |
| `/admin/staff` | Có danh sách nhân viên và role badge mock | Modal CRUD/khóa mở tài khoản, gán role/warehouse/ca, ma trận quyền, audit log | P2 |
| `/admin/thong-tin-ca-nhan` | Có form tài khoản cá nhân và đổi mật khẩu | Giữ nguyên, chỉ áp dụng shared form/feedback nếu cần; không mở rộng thành module ngoài PRD | P3 |
| `/admin/settings` | Được khai báo trong sidebar nhưng chưa có route tương ứng | Tạo route cài đặt chỉ trong phạm vi PRD: thương hiệu/kho/nhiệt độ/cấu hình VietQR-thiết bị; phụ thuộc API nên đánh dấu blocker nếu chưa có contract | P3 |

## 3. Chức năng còn thiếu hoặc chưa đúng

### 3.1. POS

- Tìm khách theo số điện thoại, hiển thị kết quả và cho phép bỏ chọn khách.
- Cho phép thanh toán không gắn Customer.
- Xóa control và text liên quan đến quét barcode vì hệ thống không hỗ trợ.
- Có quản lý nhiều đơn chờ; đổi số lượng, xóa dòng, tính lại subtotal/discount/total.
- Kiểm tra `AvailableQuantity = Quantity - ReservedQuantity` trước khi thanh toán; không cho bán khi thiếu.
- Giữ phím tắt F2/F3/F8/F9/F12 ở mức UI được hỗ trợ; không giả lập thiết bị cân/barcode khi chưa có integration.

### 3.2. Danh mục, đơn vị, sản phẩm

- Thêm tab `Đơn vị` cạnh `Danh mục` và `Sản phẩm`.
- Modal thêm/sửa Unit, validate tên/trạng thái và refresh danh sách.
- Dùng icon action sửa/xóa/kích hoạt với `aria-label`, tooltip và confirm nguy hiểm.
- Dùng một modal shell, field layout, footer action, error/loading state cho Category/Product/Unit.
- Product form giữ upload nhiều ảnh/chọn ảnh chính; bổ sung hiển thị các field PRD khi API type hỗ trợ.

### 3.3. Đơn hàng, kho, nhập hàng

- Orders cần detail/action status thay vì chỉ render bảng.
- Inventory cần multi-warehouse, transaction history, low-stock/date warning và luồng điều chỉnh.
- PO cần supplier management, detail lines, receiving/quality approval trước khi cộng kho.

### 3.4. CRM, đánh giá, khuyến mãi

- Customer detail và lịch sử điểm/đơn/địa chỉ.
- Reviews: bulk approve phải cập nhật state/API; khóa vi phạm và phản hồi phải hoạt động hoặc báo rõ API chưa có.
- Vouchers: form/preview/guardrails theo rule một voucher giảm giá + một freeship, giới hạn ngày/lượt dùng.

### 3.5. Dashboard, reports, staff/RBAC

- Dashboard bổ sung các KPI/tiến độ được PRD yêu cầu.
- Reports bổ sung tab/chỉ số và export state.
- Staff bổ sung role matrix, khóa/mở tài khoản và audit log theo quyền.

## 4. Component và modal

### 4.1. Tái sử dụng/chỉnh sửa

- `Frontend/components/admin/admin-ui.tsx`
  - `PageHeader`, `KpiGrid`, `Panel`, `StatusBadge`, `DataTable`.
  - Bổ sung `Button`, `IconButton`, `Tabs`, `Modal`, `FormField`, `EmptyState`, `LoadingState`, `ErrorState`.
- `Frontend/components/admin/resource-page.tsx`
  - Cho phép cấu hình filter/tabs/action column; bỏ nút “Tạo mới” mặc định khi route không hỗ trợ.
  - Chuẩn hóa phân trang, empty/error/loading và action callback.
- `Frontend/components/admin/admin-shell.tsx`
  - Đồng nhất sidebar/header responsive; bổ sung route settings khi được phép.
- `Frontend/app/globals.css`
  - Chỉ thêm token/utility cần thiết cho focus, overlay, scrollbar và responsive; không đổi palette ngoài design system.

### 4.2. Modal/feature component cần tạo

- `AdminModal` dùng chung cho tất cả form.
- `CatalogTabs`, `UnitFormModal`, `CategoryFormModal`, `ProductFormModal`.
- `PosCustomerPicker`, `PosHeldOrders`, `PosCartLine`, `PaymentModal`.
- `OrderDetailModal`, `OrderStatusModal`.
- `InventoryTransactionModal`, `InventoryHistoryPanel`, `WarehouseTabs`.
- `SupplierFormModal`, `PurchaseOrderFormModal`, `ReceivingApprovalModal`.
- `CustomerDetailModal`, `PointsAdjustmentModal`.
- `ReviewModerationModal`/`ReviewReplyModal`.
- `VoucherFormModal`, `VoucherPreviewCard`, `VoucherGuardrails`.
- `ReportFilters`, `ReportTabs`, `ExportFeedback`.
- `StaffFormModal`, `RoleMatrix`, `AuditLogPanel`.

Chỉ tạo service/repository/type mới khi API contract tương ứng đã tồn tại hoặc được xác nhận; nếu chưa có, UI phải hiển thị trạng thái chưa kết nối thay vì success giả.

## 5. Các file dự kiến chỉnh sửa

### Shared

- `Frontend/components/admin/admin-ui.tsx`
- `Frontend/components/admin/resource-page.tsx`
- `Frontend/components/admin/admin-shell.tsx`
- `Frontend/app/globals.css`

### Routes

- `Frontend/app/admin/pos/page.tsx`
- `Frontend/app/admin/products/page.tsx`
- `Frontend/app/admin/orders/page.tsx`
- `Frontend/app/admin/inventory/page.tsx`
- `Frontend/app/admin/purchase-orders/page.tsx`
- `Frontend/app/admin/customers/page.tsx`
- `Frontend/app/admin/reviews/page.tsx`
- `Frontend/app/admin/vouchers/page.tsx`
- `Frontend/app/admin/reports/page.tsx`
- `Frontend/app/admin/staff/page.tsx`
- `Frontend/app/admin/dashboard/page.tsx`
- `Frontend/app/admin/settings/page.tsx` (chỉ khi API/config scope được xác nhận)

### Data/API/type

- `Frontend/services/units/unit.service.ts`
- `Frontend/services/categories/category.repository.ts`
- `Frontend/services/products/product.repository.ts`
- `Frontend/services/orders/order.service.ts`
- `Frontend/services/*` tương ứng với API đã có
- `Frontend/types/api.ts`
- `Frontend/types/admin.ts`
- `Frontend/data/admin-mock.ts` (chỉ cập nhật mock để phản ánh state UI, không thay nghiệp vụ thật)

## 6. Thứ tự triển khai

### Phase 0 — Chuẩn bị và design system

1. Chốt token màu/spacing/typography/focus.
2. Tách primitives modal, tabs, button, icon action, form state.
3. Refactor `ResourcePage` nhưng giữ behavior hiện có.

**Đạt khi:** các trang cũ vẫn render, shared components có loading/error/empty/accessibility cơ bản.

### Phase 1 — Catalog

1. Refactor `products/page.tsx` theo tab và modal shell chung.
2. Thêm Unit tab/form/CRUD theo `unit.service`.
3. Đổi action thành icon và bổ sung confirm/error/refresh.
4. Kiểm tra Product image upload, Category parent và validation.

**Đạt khi:** Product/Category/Unit có tab, modal add/edit, action hoạt động đúng API/mock mode.

### Phase 2 — POS

1. Tách customer picker, cart line, held orders và payment.
2. Tìm theo phone; cho phép clear/guest.
3. Xóa barcode scan UI; giữ tìm sản phẩm/SKU và cân chỉ khi có integration.
4. Thêm quantity/remove, stock guard, payment feedback.

**Đạt khi:** thao tác đơn guest và đơn có khách chạy được, không bán vượt available stock.

### Phase 3 — Operations

1. Orders detail/status.
2. Inventory warehouse/tồn khả dụng/transaction/FIFO warnings.
3. Supplier + PO CRUD, receiving approval và print action.

**Đạt khi:** các state transition bị chặn đúng điều kiện và không success giả khi API thiếu.

### Phase 4 — CRM và Marketing

1. Customer detail/points/segments.
2. Review moderation/reply/bulk actions.
3. Voucher form/preview/guardrails.

**Đạt khi:** filter/tab/modal/action thay đổi đúng state và phản hồi lỗi rõ ràng.

### Phase 5 — Analytics và RBAC

1. Dashboard/report tabs và filters.
2. Export loading/success/error.
3. Staff CRUD, role matrix, audit log và permission gating.

**Đạt khi:** chỉ role phù hợp thấy action nhạy cảm; report hiển thị đúng filter.

### Phase 6 — Nghiệm thu

1. Kiểm tra responsive tại 1440, 1280, tablet và mobile.
2. Chạy lint/build/type-check.
3. Chạy checklist CRUD, modal, tabs, keyboard/focus, error/empty/loading.
4. Đối chiếu lại từng acceptance criteria PRD và ghi blocker API còn tồn tại.

## 7. Tiêu chí nghiệm thu tổng thể

- Giao diện tiếng Việt, responsive và dùng chung design system giữa các module.
- Không còn action barcode trong POS.
- POS hỗ trợ phone lookup và guest checkout; thanh toán chặn tồn khả dụng không đủ.
- Catalog có đủ Product/Category/Unit; modal và action nhất quán.
- Các modal có mở/đóng, validate, loading, lỗi, submit và refresh.
- CRUD/action không chỉ là UI tĩnh; lỗi API được hiển thị, không nuốt lỗi.
- PO chỉ cộng tồn sau khi duyệt nghiệm thu.
- Voucher thể hiện guardrails của PRD; điểm khách hàng và trạng thái review có flow rõ ràng.
- Dashboard/report có bộ lọc và trạng thái export; staff/RBAC có role/audit surface.
- `npm run lint` và `npm run build` chạy thành công sau mỗi phase liên quan.

## 8. Blocker và rủi ro

- Nhiều route hiện dùng mock data; cần xác nhận API contract trước khi cam kết CRUD thật.
- Unit service hiện hỗ trợ lấy danh sách nhưng chưa thể hiện đầy đủ create/update/delete trong màn hình.
- Thiết bị cân điện tử, máy in bill và VietQR là integration ngoài browser; chỉ triển khai UI contract/state khi chưa có adapter.
- Worktree đang có thay đổi không thuộc Admin; mọi phase phải tránh đụng hoặc hoàn tác các file đó.
- Không mở rộng sang AI, realtime notification, mobile native, thanh toán online thật hoặc đa chi nhánh phức tạp vì nằm ngoài PRD.

## 9. Đối chiếu API Backend hiện có

| Phân hệ | API đã có | Frontend service đã nối | Trạng thái |
|---|---|---|---|
| Catalog | `/api/categories`, `/api/units`, `/api/products` CRUD/status/images | Category/Product repositories, Unit repository | Đủ contract |
| POS/Orders | `/api/orders`, `/api/orders/pos`, `/api/orders/{id}`, status, coupon | `services/orders/admin-order.service.ts` | Đủ contract; cần thay mock page bằng loader khi tắt mock |
| Payment | `/api/orders/{id}/payment` GET/POST/status | `services/payments/payment.service.ts` | Đủ contract |
| Delivery | `/api/orders/{id}/delivery` GET/POST/status | `services/deliveries/delivery.service.ts` | Đủ contract |
| Customers | `/api/customers` CRUD và address book | `services/customers/customer.service.ts` | Đủ contract; points/segments chưa có endpoint riêng |
| Inventory | `/api/inventories`, low-stock | `services/inventory/inventory.service.ts` | Đủ contract đọc tồn |
| Stock transaction | `/api/stock-transactions` GET/detail/POST | `services/inventory/inventory.service.ts` | Đủ contract cho giao dịch |
| Warehouses | `/api/warehouses` CRUD | `services/warehouses/warehouse.service.ts` | Đủ contract |
| Suppliers | `/api/suppliers` CRUD/status | `services/suppliers/supplier.service.ts` | Đủ contract |
| Purchase Orders | detail, create/update, add/remove detail, order, receive | `services/purchase-orders/purchase-order.service.ts` | Đủ contract chính; danh sách PO chưa có GET list |
| Reviews | product reviews GET/POST, approval, delete | `services/reviews/review.service.ts` | Có contract nhưng chưa có endpoint list toàn bộ review |
| Reports | revenue, top-selling, inventory | `services/reports/report.service.ts` | Đủ contract cho báo cáo hiện tại |
| Users/RBAC | users CRUD/status/roles; roles GET/CRUD | `services/users/user.service.ts`, `services/roles/role.service.ts` | Đủ contract cơ bản |
| Voucher | Không có `Coupons/VouchersController` | Chưa tạo service | Blocker backend; chỉ được giữ form draft/preview |
| Audit log | Không có `AuditLogsController` | Chưa tạo service | Blocker backend |

### Quyết định triển khai tiếp theo

1. Dùng `NEXT_PUBLIC_USE_MOCK_API=false` để các page Admin chuyển sang API thật khi backend đang chạy.
2. Nối loader/action thật trước cho Orders, Inventory, Suppliers/PO, Customers, Reports và Staff.
3. Với Reviews, API hiện chỉ truy vấn theo `productId`; Admin cần endpoint list toàn bộ review hoặc query theo product trước khi bỏ mock hoàn toàn.
4. Không giả lập API Voucher, Audit Log, loyalty points/segments hoặc export PDF khi backend chưa cung cấp contract.
