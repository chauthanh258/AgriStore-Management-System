# AgriStore Backend

ASP.NET Core Web API .NET 10 cho hệ thống quản lý cửa hàng nông phẩm.

## Yêu cầu

- .NET 10 SDK
- PostgreSQL đang chạy local
- Database `agristore`

## Cấu hình local

`appsettings.Development.json` chỉ chứa mẫu. Không ghi password database thật vào file này hoặc commit lên Git. Dùng User Secrets tại thư mục workspace:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=<external-host>;Port=5432;Database=<database>;Username=<username>;Password=<password>;SSL Mode=Require" --project Backend/AgriStore.Api
dotnet user-secrets set "Jwt:Key" "<chuoi-ky-it-nhat-32-ky-tu>" --project Backend/AgriStore.Api
dotnet user-secrets set "Jwt:Issuer" "AgriStore.Api" --project Backend/AgriStore.Api
dotnet user-secrets set "Jwt:Audience" "AgriStore.Client" --project Backend/AgriStore.Api
```

Thay các giá trị trong dấu `<...>` bằng thông tin **External Database URL** của nhà cung cấp PostgreSQL. Host nội bộ như `dpg-...` có thể không truy cập được từ máy local; hãy dùng external host/domain và giữ `SSL Mode=Require` nếu nhà cung cấp yêu cầu SSL.

Kiểm tra secret đã lưu:

```powershell
dotnet user-secrets list --project Backend/AgriStore.Api
```

Không commit password hoặc JWT key vào repository.

## Migration và chạy API

```powershell
dotnet restore Backend/AgriStore.Api
dotnet ef database update --project Backend/AgriStore.Api --startup-project Backend/AgriStore.Api
dotnet run --project Backend/AgriStore.Api
```

Migration `AddCommerceSchema` tạo 24 bảng nghiệp vụ theo `DATABASE_TABLE` và dữ liệu mẫu cho danh mục, sản phẩm, kho, nhập hàng, khách hàng, đơn hàng, thanh toán, giao hàng, coupon, review và audit log.

Khi API khởi động, hệ thống tự động seed bốn role và bốn tài khoản development:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@agristore.local` | `AgriStore123` |
| Manager | `manager@agristore.local` | `AgriStore123` |
| Staff | `staff@agristore.local` | `AgriStore123` |
| Customer | `customer@agristore.local` | `AgriStore123` |

Các tài khoản trên chỉ dùng cho development. Không sử dụng mật khẩu này trong production.

Swagger chạy tại URL được in trong terminal, thường là `http://localhost:5274/swagger`.

## Cách sử dụng API

### 1. Đăng nhập (Login)

Gửi `POST /api/auth/login` với body:

```json
{
  "email": "admin@agristore.local",
  "password": "AgriStore123"
}
```

Response chứa `token` (JWT). Dùng token này cho các endpoint yêu cầu xác thực.

### 2. Gọi endpoint có xác thực

Thêm header:

```
Authorization: Bearer <token>
```

### 3. Các module chính

- `UsersController`: quản lý người dùng (`GET /api/users`, `PUT /api/users/{id}`)
- `Auth`: đăng nhập, đăng ký
- Các bảng nghiệp vụ: sản phẩm, danh mục, kho, đơn hàng, thanh toán, giao hàng, coupon, review, audit log

### 4. Kiểm tra Swagger

Truy cập `http://localhost:5274/swagger` để xem đầy đủ endpoint, thử gọi và xem schema.

## Cấu trúc chính

- `Domain/Entities`: entity Identity tùy biến.
- `Data`: DbContext, seeder và migration.
- `Controllers`: HTTP endpoints theo từng module.
- `DTOs`: request/response contract.
- `Services`: nghiệp vụ ứng dụng.
