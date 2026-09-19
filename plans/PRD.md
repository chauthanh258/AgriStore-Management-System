**PRODUCT REQUIREMENTS DOCUMENT (PRD)**  
**Dự án: Hệ thống Quản lý Cửa hàng Nông phẩm**  
**Phiên bản:** 1.0  
**Ngày:** 18/09/2026  
**Công nghệ:** ASP.NET Core Web API + Next.js (TypeScript)  
**Loại dự án:** Bài tập nhóm (chạy local, không deploy)

---

### 1. Tổng quan dự án

**Tên đề tài:** Xây dựng hệ thống quản lý cửa hàng nông phẩm

Hệ thống hỗ trợ quản lý toàn bộ hoạt động của một cửa hàng bán nông phẩm (rau củ, trái cây, thực phẩm sạch, phân bón, giống cây…), bao gồm:
- Quản lý sản phẩm và danh mục
- Quản lý kho và tồn kho
- Nhập hàng từ nhà cung cấp
- Bán hàng (tại quầy + online cơ bản)
- Quản lý khách hàng
- Báo cáo doanh thu và tồn kho
- Phân quyền người dùng

Hệ thống được phát triển dưới dạng **web application**, chạy hoàn toàn trên máy local phục vụ mục đích học tập và báo cáo đồ án.

---

### 2. Mục tiêu dự án

| Mục tiêu | Mô tả |
|----------|------|
| Mục tiêu chính | Xây dựng hệ thống quản lý cửa hàng nông phẩm đầy đủ các chức năng cốt lõi |
| Mục tiêu kỹ thuật | Áp dụng kiến trúc Backend (.NET) + Frontend (Next.js), thiết kế database quan hệ chuẩn |
| Mục tiêu học tập | Mỗi thành viên làm fullstack một module, hiểu rõ luồng nghiệp vụ end-to-end |
| Mục tiêu cuối | Hệ thống chạy ổn định trên local, có đầy đủ tài liệu và demo được |

---

### 3. Phạm vi dự án

**Trong phạm vi (In Scope):**
- Quản lý người dùng + phân quyền (Admin, Manager, Staff, Customer)
- Quản lý danh mục, đơn vị tính, sản phẩm, hình ảnh, đánh giá
- Quản lý kho, tồn kho, giao dịch nhập/xuất/kiểm kê
- Quản lý nhà cung cấp và đơn nhập hàng
- Quản lý khách hàng, địa chỉ, đơn bán hàng, thanh toán, giao hàng
- Mã giảm giá cơ bản
- Báo cáo doanh thu, sản phẩm bán chạy, tồn kho
- Giao diện Admin + giao diện Client cơ bản

**Ngoài phạm vi (Out of Scope):**
- Thanh toán online thật (VNPay, Momo…) → chỉ mô phỏng
- Ứng dụng mobile native
- Đa cửa hàng / đa chi nhánh phức tạp
- AI gợi ý sản phẩm, chatbot
- Deploy lên server thật
- Thông báo realtime (SignalR) nâng cao

---

### 4. Người dùng & Phân quyền

| Vai trò | Mô tả | Quyền chính |
|---------|------|-------------|
| **Admin** | Quản trị viên hệ thống | Toàn quyền |
| **Manager** | Quản lý cửa hàng | Quản lý sản phẩm, kho, đơn hàng, báo cáo, nhân viên |
| **Staff** | Nhân viên bán hàng / kho | Tạo đơn bán, nhập hàng, xem tồn kho |
| **Customer** | Khách hàng | Xem sản phẩm, đặt hàng, đánh giá, xem lịch sử |

---

### 5. Yêu cầu chức năng chi tiết

#### 5.1. Module Auth + User + Role
- Đăng ký / Đăng nhập / Đăng xuất
- JWT Authentication + Refresh Token
- Quản lý người dùng (CRUD, khóa/mở khóa)
- Quản lý Role và gán Role cho User
- Phân quyền theo Role trên API và giao diện

#### 5.2. Module Sản phẩm
- Quản lý Danh mục (hỗ trợ danh mục con)
- Quản lý Đơn vị tính (Kg, bó, thùng, gói…)
- CRUD Sản phẩm (mã, tên, giá nhập, giá bán, mô tả, hạn sử dụng…)
- Upload nhiều ảnh sản phẩm, chọn ảnh chính
- Tìm kiếm, lọc, phân trang sản phẩm
- Đánh giá sản phẩm (Client gửi – Admin duyệt)

#### 5.3. Module Kho
- Quản lý Kho (nhiều kho)
- Xem tồn kho theo sản phẩm / theo kho
- Cảnh báo tồn kho thấp
- Tạo giao dịch kho: Nhập, Xuất, Kiểm kê, Điều chỉnh
- Lịch sử giao dịch kho
- Tự động cập nhật tồn kho khi nhập hàng / bán hàng

#### 5.4. Module Nhà cung cấp + Đơn nhập
- CRUD Nhà cung cấp
- Tạo / sửa / xem Đơn nhập hàng
- Thêm sản phẩm vào đơn nhập (số lượng, đơn giá)
- Nhận hàng (cập nhật số lượng thực nhận)
- Tự động tạo giao dịch kho khi nhận hàng
- In phiếu nhập (xuất PDF cơ bản)

#### 5.5. Module Bán hàng + Báo cáo
- Quản lý Khách hàng + Địa chỉ giao hàng
- Tạo đơn bán hàng (POS tại quầy + đặt online cơ bản)
- Áp dụng mã giảm giá
- Thanh toán (tiền mặt, chuyển khoản – mô phỏng)
- Quản lý giao hàng và trạng thái giao
- Dashboard + Báo cáo:
  - Doanh thu theo ngày / tháng
  - Sản phẩm bán chạy
  - Tồn kho hiện tại
  - Đơn hàng theo trạng thái

---

### 6. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|------|--------|
| Hiệu năng | Trang danh sách tải dưới 2 giây với dữ liệu vừa (vài nghìn bản ghi) |
| Bảo mật | Mật khẩu hash, JWT, phân quyền chặt chẽ, validate input |
| Khả năng sử dụng | Giao diện tiếng Việt, responsive cơ bản, dễ thao tác |
| Độ tin cậy | Không để tồn kho âm, xử lý lỗi rõ ràng |
| Bảo trì | Code sạch, có comment, tài liệu API và hướng dẫn sử dụng |

---

### 7. Công nghệ sử dụng

**Backend:**
- ASP.NET Core 8/9 Web API
- Entity Framework Core
- PostgreSQL
- JWT + ASP.NET Identity
- FluentValidation, AutoMapper

**Frontend:**
- Next.js 14/15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)
- Axios
- Recharts (biểu đồ)

**Khác:**
- Git + GitHub
- Postman / Swagger
- Figma (thiết kế UI)

---

### 8. Database (Tóm tắt)

Hệ thống sử dụng **24 bảng** chính đã thiết kế trước đó, bao gồm:

- Users, Roles, UserRoles
- Categories, Units, Products, ProductImages, ProductReviews
- Warehouses, Inventories, StockTransactions
- Suppliers, PurchaseOrders, PurchaseOrderDetails
- Customers, Addresses
- Orders, OrderDetails, Payments, Deliveries, Coupons
- Notifications, AuditLogs

---

### 9. Luồng nghiệp vụ chính

1. **Nhập hàng:** Tạo đơn nhập → Chọn NCC + sản phẩm → Nhận hàng → Tự động cộng tồn kho
2. **Bán hàng:** Chọn sản phẩm → Kiểm tra tồn → Tạo đơn → Thanh toán → Trừ tồn kho
3. **Quản lý tồn:** Xem tồn → Cảnh báo thấp → Kiểm kê / Điều chỉnh
4. **Báo cáo:** Xem doanh thu, sản phẩm bán chạy, tình hình tồn kho

---

### 10. Tiêu chí hoàn thành (Acceptance Criteria)

- Đăng nhập phân quyền hoạt động đúng 4 vai trò
- Có thể thêm/sửa/xóa sản phẩm + upload ảnh
- Nhập hàng cập nhật đúng tồn kho
- Bán hàng trừ đúng tồn kho, không cho bán khi hết hàng
- Có Dashboard và báo cáo cơ bản
- Giao diện tiếng Việt, chạy ổn định trên local
- Có tài liệu hướng dẫn sử dụng + tài liệu kỹ thuật
- Demo được toàn bộ luồng chính

---

### 11. Phân công & Thời gian

- **Thời gian:** 13 tuần (15/09/2026 – 12/12/2026)
- **Hình thức:** Mỗi thành viên làm fullstack 1 module
- **5 thành viên:**
  - Nguyễn An → Auth + User + Role
  - Trần Bình → Sản phẩm + Danh mục + Đánh giá
  - Lê Cường → Kho + Tồn kho
  - Phạm Duyên → Nhà cung cấp + Đơn nhập
  - Hoàng Em → Khách hàng + Đơn bán + Báo cáo

---

### 12. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| Thành viên làm chậm tiến độ | Họp tuần, cập nhật bảng kế hoạch hàng tuần |
| Conflict khi tích hợp tồn kho | Thống nhất API contract sớm (tuần 7–8) |
| Scope bị phình | Chỉ làm đúng những gì trong PRD |
| Lỗi logic tồn kho | Viết test kỹ các trường hợp biên |

---