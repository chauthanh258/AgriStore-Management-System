PRODUCT REQUIREMENTS DOCUMENT (PRD) & PROJECT BRIEF

HỆ THỐNG QUẢN LÝ CỬA HÀNG NÔNG PHẨM - AGRISTORE (AGRISTORE MANAGEMENT SYSTEM)



THÔNG TIN DỰ ÁN (PROJECT BRIEF)





Tên dự án: Hệ thống Quản trị & Bán hàng Nông sản Sạch AgriStore (AgriStore Omnichannel Management System)



Phiên bản tài liệu: v2.0 - Final Consolidated PRD & UI/UX Architecture



Ngày phát hành: Tháng 09/2026



Đơn vị phát triển: Nhóm Kỹ sư Fullstack (Đồ án Kỹ thuật Công nghệ / Capstone Project)



Môi trường triển khai: Web Application (Local Environment & Cloud Staging Ready)



Công nghệ chủ đạo:





Backend: ASP.NET Core 8/9 Web API, Entity Framework Core, PostgreSQL, ASP.NET Identity, JWT Authentication, FluentValidation.



Frontend: Next.js 14/15 (App Router, TypeScript), Tailwind CSS, shadcn/ui, TanStack Query, Recharts, Lucide Icons.



Kiến trúc thiết kế: Thiết kế hướng thành phần (Atomic/Component-Driven Design System), Responsive Desktop (1440px / 1280px Grid).



1. BỐI CẢNH & TỔNG QUAN HỆ THỐNG (PROJECT OVERVIEW)

1.1. Tuyên ngôn sản phẩm (Product Statement)

AgriStore là nền tảng quản trị và bán lẻ nông sản tươi sạch chuẩn VietGAP/GlobalGAP khép kín theo mô hình Omnichannel (Tại quầy POS & Đặt hàng trực tuyến giao nhanh 2 giờ). Hệ thống kết nối chuỗi cung ứng từ các nông trại/hợp tác xã (Đà Lạt, Mộc Châu, Miền Tây) đến kho mát trung tâm và trực tiếp tới tay người tiêu dùng.

1.2. Vấn đề giải quyết (Problem Statement)





Đặc thù nông sản tươi: Vòng đời ngắn, dễ hư hỏng, yêu cầu bảo quản nhiệt độ nghiêm ngặt (4°C - 8°C) và tỷ lệ hao hụt cao nếu không kiểm soát tốt thời gian lưu kho.



Tồn kho âm & Thất thoát: Bán hàng tại quầy không đồng bộ kịp thời với đặt hàng online dẫn đến tình trạng xuất bán khi thực tế đã hết hàng.



Quy trình nhập hàng phức tạp: Nông sản biến động giá theo mùa vụ, quy cách đóng gói đa dạng (bó, kg, hộp, túi hút chân không), cần kiểm định chất lượng (độ Brix, test vi sinh/dư lượng thuốc BVTV) trước khi nhập kho.



Trải nghiệm khách hàng: Người tiêu dùng cần minh bạch nguồn gốc nông trại, chứng nhận VietGAP và dịch vụ đóng thùng xốp giữ lạnh giao hỏa tốc.

1.3. Mục tiêu chiến lược (OKRs)





Mục tiêu 1: Xây dựng hệ thống quản lý toàn diện 2 phân hệ: Storefront (Khách hàng) và Admin/POS (Vận hành & Thu ngân).



Mục tiêu 2: Kiểm soát tồn kho chính xác theo thời gian thực (Zero Negative Stock), tự động luân chuyển FIFO và cảnh báo hạn dùng (<48h).



Mục tiêu 3: Tối ưu tốc độ bán hàng tại quầy (dưới 15 giây/đơn hàng với cân điện tử và thanh toán Dynamic VietQR).



2. PHÂN HỆ NGƯỜI DÙNG & MA TRẬN PHÂN QUYỀN (RBAC)

Hệ thống phân định 4 nhóm vai trò (Roles) chính:



3. DANH THỰC THỰC HIỆN & ĐẶC TẢ GIAO DIỆN (UI/UX SPECIFICATIONS)

Toàn bộ hệ thống giao diện đã được thiết kế và hiện thực hóa thành 16 màn hình hoàn chỉnh trên Canvas:

PHÂN HỆ I: KHÁCH HÀNG (CUSTOMER STOREFRONT)





Trang Chủ Nông Sản Tươi Sạch (Home Page):





Hero banner với cam kết VietGAP, giao 2 giờ trong thùng xốp giữ lạnh.



Danh mục nông sản nổi bật (Rau củ hữu cơ, Trái cây đặc sản, Nấm & Mầm, Gạo hạt).



Khu vực Flash Sale đếm ngược thời gian thực, sản phẩm bán chạy trong tuần và form đăng ký cẩm nang dinh dưỡng nhận voucher 10%.



Danh Sách Nông Sản & Bộ Lọc Nâng Cao (Product Catalog):





Thanh lọc đa chiều: theo danh mục, khoảng giá slider, đơn vị tính (Kg, Hộp, Bó, Thùng), tiêu chuẩn canh tác (VietGAP, USDA Organic, OCOP 4 sao), nguồn gốc xuất xứ (Đà Lạt, Mộc Châu, Gia Lai).



Lưới sản phẩm trực quan hiển thị badge tồn kho tươi mới, xuất xứ và nút mua nhanh.



Chi Tiết Sản Phẩm (Product Detail - Dâu Tây Hana Mộc Châu):





Thư viện ảnh nông trường thực tế, thông số Brix, hạn dùng, quy cách đóng gói (hộp đơn 500g, combo 2 hộp).



Tabs nội dung: Mô tả quy trình trồng nhà kính, hướng dẫn bảo quản ngăn mát, chứng nhận kiểm định và đánh giá sao từ khách mua thật.



Giỏ Hàng Của Bạn (Shopping Cart):





Bảng sản phẩm tăng giảm số lượng, thanh tiến độ Freeship toàn thành phố.



Tùy chọn giao hỏa tốc 2 giờ kèm thùng xốp đá gel hoặc hẹn giờ nhận hàng, ô ghi chú chọn quả chín cho nhân viên kho.



Đặt Hàng & Thanh Toán (Checkout):





Stepper 3 bước rõ ràng; Sổ địa chỉ nhận hàng linh hoạt (Nhà riêng / Cơ quan).



Đa dạng phương thức thanh toán: Dynamic VietQR Napas 24/7, Tiền mặt COD, Ví VNPay/MoMo, Thẻ Visa/Mastercard.



Tóm tắt chi phí, mã ưu đãi MUAXANH10 và tích lũy điểm thưởng hội viên AgriClub.



Thông Tin Tài Khoản & Lịch Sử Đơn Hàng (Customer Profile):





Thống kê hạng thành viên Gold Member, quỹ điểm thưởng AgriPoints (1.250 pts), hồ sơ cá nhân và thói quen khẩu vị.



Quản lý nhiều địa chỉ giao hàng và danh sách lịch sử đơn hàng theo dõi xe lạnh theo thời gian thực.

PHÂN HỆ II: QUẢN TRỊ & BÁN HÀNG TẠI QUẦY (ADMIN & POS)





Bán Hàng Tại Quầy Chuyên Nghiệp (AgriStore POS):





Giao diện Dark/Light tối ưu thao tác nhanh, tích hợp hệ thống phím tắt (F2 thêm đơn, F3 tìm kiếm, F4 đọc cân điện tử CAS, F8 tiền mặt, F9 VietQR, F12 in bill).



Đọc cân điện tử tự động cho hàng bán theo Kg (0.850 kg x 70.000 đ = 59.500 đ).



Quản lý đa đơn chờ đồng thời, tra cứu hội viên VIP tự động trừ điểm thưởng hoặc áp voucher.



Tổng Quan Quản Trị (Admin Dashboard):





KPI thời gian thực: Doanh thu ngày, phân tách đơn POS vs Online hỏa tốc, cảnh báo 07 SKU chạm ngưỡng MinStockAlert và 04 mặt hàng date < 3 ngày.



Biểu đồ nhịp doanh thu theo giờ và biểu đồ cơ cấu doanh thu theo ngành hàng.



Bảng Top nông sản bán chạy và tiến độ xe lạnh chuyển hàng liên kho.



Quản Lý Sản Phẩm & Danh Mục Nông Sản:





Quản lý 148 SKU hoạt động; hiển thị giá vốn, giá bán lẻ, biên lợi nhuận (%) và tình trạng kho.



Bộ lọc theo kho phân phối và tiêu chuẩn canh tác VietGAP / OCOP.



Quản Lý Kho & Tồn Kho Nông Sản:





Quản lý đa kho (Kho lạnh Q3, Kho tổng Đà Lạt, Kho Mộc Châu).





Phân tách rành mạch: Tồn thực tế - Hàng giữ đơn = Tồn khả dụng (loại trừ rủi ro tồn kho âm).



Bảng kiểm soát hạn date theo quy tắc FIFO, thuật toán gợi ý Reorder đặt hàng nhà vườn tự động.



Quản Lý Đơn Nhập Hàng & Nhà Cung Cấp (Purchase Orders):





Theo dõi công nợ NCC gối đầu 15 ngày, tiến độ xe hàng lạnh đang vận chuyển.





Quy trình nghiệm thu 4 bước: kiểm định độ tươi, test dư lượng hóa chất và duyệt tự động nhập kho sinh bản ghi Inventories.



Quản Trị Khách Hàng & Hội Viên (CRM):





Phân nhóm khách hàng (VIP Gold, Bạc/Đồng, Khách mới, Nguy cơ rời bỏ >30 ngày).





Hồ sơ chi tiết khẩu vị ưa thích, giá trị vòng đời (LTV), lịch sử đơn hàng và chính sách điểm thưởng.



Quản Lý Nhân Viên & Phân Quyền (RBAC):





Danh sách nhân sự nội bộ, phân quyền theo vai trò (Admin, Manager, Staff POS, Staff Kho), trạng thái ca trực.





Ma trận quyền hạn chi tiết và Audit Logs ghi vết mọi thao tác nhạy cảm (duyệt PO, xóa đơn, mở ca POS).



Quản Lý Khuyến Mãi & Voucher:





Quản lý mã ưu đãi, flash sale ngày, điều kiện đơn tối thiểu, mức giảm tối đa.





Xem trước Voucher trực quan (Live Preview Card) và cơ chế chống gian lận (Guardrails).



Báo Cáo & Thống Kê Doanh Thu Chi Tiết (Analytics):





Tích hợp Recharts: Biểu đồ cột/đường doanh thu & lợi nhuận gộp theo ngày, donut chart phương thức thanh toán.





Phân tích vòng quay hàng tồn kho (Inventory Turnover) và kiểm soát hao hụt kho lạnh.



Cài Đặt Cửa Hàng & Cấu Hình Hệ Thống:





Pháp lý thương hiệu, quản trị mạng lưới kho hàng, tham số cảnh báo nhiệt độ kho lạnh (4°C - 8°C).





Tích hợp cổng VietQR Napas 24/7 và cấu hình thiết bị ngoại vi thu ngân (máy in bill 80mm, cân điện tử).



4. ĐẶC TẢ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - 24 BẢNG)

Hệ thống sử dụng cơ sở dữ liệu quan hệ PostgreSQL chuẩn hóa với 24 bảng:





Users: Quản lý tài khoản (Admin, Manager, Staff, Customer), mật khẩu mã hóa BCrypt/ASP.NET Identity, Avatar, trạng thái hoạt động.



Roles: Định nghĩa vai trò (Admin, Manager, Staff, Customer).



UserRoles: Khóa ngoại liên kết nhiều-nhiều giữa Users và Roles.



Categories: Cây danh mục nông sản hỗ trợ đa cấp (ParentId tự tham chiếu).



Units: Đơn vị tính (Kg, Gram, Hộp, Bó, Túi, Thùng...).



Products: Bảng sản phẩm cốt lõi (SKU, Tên, CategoryId, UnitId, CostPrice, SellingPrice, MinStockAlert, ExpiryDays).



ProductImages: Thư viện ảnh sản phẩm, cờ IsMain, thứ tự sắp xếp SortOrder.



Suppliers: Danh bạ nhà cung cấp/hợp tác xã (Mã, Tên, Người liên hệ, MST, Địa chỉ, SĐT).



Warehouses: Danh mục kho hàng (Kho lạnh bán lẻ, kho tổng thu gom, kho trung chuyển).



Inventories: Quản lý số lượng tồn theo từng kho (ProductId + WarehouseId), phân tách Quantity và ReservedQuantity.



StockTransactions: Lịch sử biến động kho (Loại: Import, Export, Adjust, Transfer; Số lượng, Chứng từ tham chiếu).



PurchaseOrders: Đơn đặt hàng nhà cung cấp (Mã PO, SupplierId, WarehouseId, Tổng tiền, Trạng thái).



PurchaseOrderDetails: Chi tiết đơn nhập hàng (ProductId, Số lượng đặt, Số lượng thực nhận, Đơn giá nhập).



Customers: Hồ sơ khách hàng (UserId liên kết, Họ tên, SĐT, Điểm tích lũy LoyaltyPoints, Khẩu vị ghi chú).



Addresses: Sổ địa chỉ giao hàng (Tỉnh/Thành, Quận/Huyện, Địa chỉ chi tiết, cờ IsDefault).



Orders: Đơn hàng tổng (Mã đơn, CustomerId, UserId nhân viên tạo nếu là POS, Tổng tiền, Giảm giá, Phí ship, Trạng thái).



OrderDetails: Chi tiết mặt hàng trong đơn (OrderId, ProductId, Số lượng, Đơn giá bán, Thành tiền).



Payments: Giao dịch thanh toán (OrderId, Phương thức thanh toán, Số tiền, Trạng thái, Mã giao dịch ngân hàng).



ShippingMethods: Phương thức vận chuyển (Giao siêu tốc 2h thùng xốp, Giao tiêu chuẩn, Cước phí).



Deliveries: Vận đơn giao hàng (OrderId, TrackingCode, Thông tin tài xế xe lạnh, Trạng thái giao, Thời gian).



Coupons: Mã giảm giá (Code, Loại chiết khấu, Giá trị giảm, Đơn tối thiểu, Hạn ngạch, Lượt đã dùng).



ProductReviews: Đánh giá sản phẩm từ khách hàng (1-5 sao, Bình luận, Ảnh phản hồi, Trạng thái duyệt).



Notifications: Thông báo hệ thống cho người dùng (Đơn hàng mới, Cảnh báo kho, Khuyến mãi).



AuditLogs: Nhật ký kiểm toán an ninh (UserId, Hành động, Tên bảng, ID bản ghi, Giá trị cũ/mới, IP Address).



5. CÁC QUY TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS RULES & GUARDRAILS)





Quy tắc Chống tồn kho âm (Strict Non-Negative Stock):





Khi tạo đơn (POS hoặc Online), hệ thống kiểm tra AvailableQuantity = Quantity - ReservedQuantity. Nếu AvailableQuantity < Số lượng mua, hệ thống chặn xuất bán ngay lập tức.



Quy tắc Kiểm soát Chuỗi lạnh & FIFO:





Nông sản xuất kho ưu tiên theo lô nhập trước (First-In, First-Out). Các mặt hàng rau ăn lá có ExpiryDays còn dưới 48 giờ sẽ tự động kích hoạt cờ cảnh báo trên màn hình Quản lý kho để áp chương trình "Flash Sale Xả Nhanh Khung Giờ Vàng".



Quy tắc Nghiệm thu PO:





Khi xe lạnh chở nông sản đến kho, nhân viên kho thực hiện kiểm định mẫu. Chỉ khi bấm "Duyệt Nghiệm Thu", hệ thống mới cộng số lượng thực nhận vào bảng Inventories và tạo giao dịch StockTransactions (Import).



Quy tắc Giảm giá & Voucher:





Mỗi khách hàng chỉ được dùng 1 voucher/ngày; không cho phép cộng dồn 2 voucher tiền mặt trên cùng 1 đơn (chỉ cho phép kết hợp 01 mã Freeship + 01 mã Giảm giá mặt hàng). Khi hủy đơn hàng, lượt sử dụng voucher được tự động hoàn trả lại.



Quy tắc Tích điểm & Đổi thưởng AgriClub:





10.000 VNĐ chi tiêu = 1 Điểm thưởng (AgriPoint). 100 Điểm thưởng quy đổi tương đương 10.000 VNĐ khi thanh toán tại quầy POS hoặc đặt online.



6. KẾ HOẠCH TRIỂN KHAI & PHÂN CÔNG (ROADMAP - 13 TUẦN)





Giai đoạn 1 (Tuần 1 - 3): Nền tảng & Kiến trúc:





Thiết lập cơ sở dữ liệu PostgreSQL 24 bảng.



Xây dựng Core API ASP.NET Core, triển khai JWT Authentication và phân quyền RBAC (Phụ trách: Thành viên 1).



Giai đoạn 2 (Tuần 4 - 6): Module Sản phẩm & Chuỗi cung ứng:





CRUD Danh mục, Đơn vị tính, Sản phẩm, Upload ảnh (Thành viên 2).



Quản lý Nhà cung cấp, Đơn đặt hàng PO, Nghiệm thu nhập kho (Thành viên 4).



Giai đoạn 3 (Tuần 7 - 9): Vận hành Kho & Bán hàng POS:





Quản lý Kho, Tồn kho đa điểm, Giao dịch kho, Cảnh báo date FIFO (Thành viên 3).



Xây dựng màn hình POS tại quầy tích hợp cân điện tử và VietQR (Thành viên 5).



Giai đoạn 4 (Tuần 10 - 11): Storefront Khách hàng & Thanh toán:





Hoàn thiện Catalog, Giỏ hàng, Luồng Checkout, Đơn vận chuyển và CRM tích điểm (Thành viên 2 & 5).



Giai đoạn 5 (Tuần 12 - 13): Báo cáo Analytics, Kiểm thử & Đóng gói:





Tích hợp Recharts thống kê doanh thu, Audit Logs, kiểm thử tích hợp (Integration Test) và đóng gói tài liệu nghiệm thu.

