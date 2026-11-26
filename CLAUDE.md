# CLAUDE.md

Luôn trả lời câu hỏi bằng tiếng Việt

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgriStore is an agricultural product management system with:
- **Backend**: ASP.NET Core Web API (.NET 10) with PostgreSQL
- **Frontend**: Next.js 16 (React 19) with TypeScript and Tailwind CSS 4

## Common Commands

### Backend (from `Backend/AgriStore.Api/`)

```bash
# Restore packages
dotnet restore

# Run database migrations
dotnet ef database update --project Backend/AgriStore.Api --startup-project Backend/AgriStore.Api

# Run API
dotnet run --project Backend/AgriStore.Api

# Build
dotnet build

# Check for compilation errors
dotnet build --no-restore
```

### Frontend (from `Frontend/`)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm run start

# Lint
npm run lint
```

### Database Setup (User Secrets)

```powershell
# Set connection string
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=<host>;Port=5432;Database=<db>;Username=<user>;Password=<pwd>;SSL Mode=Require" --project Backend/AgriStore.Api

# Set JWT key (min 32 chars)
dotnet user-secrets set "Jwt:Key" "<32-char-secret>" --project Backend/AgriStore.Api
dotnet user-secrets set "Jwt:Issuer" "AgriStore.Api" --project Backend/AgriStore.Api
dotnet user-secrets set "Jwt:Audience" "AgriStore.Client" --project Backend/AgriStore.Api
```

## Architecture

### Backend Structure

```
Backend/AgriStore.Api/
├── Controllers/          # HTTP endpoints (REST API)
├── Data/                 # DbContext, migrations, seeder
├── Domain/Entities/      # Core domain entities
├── DTOs/                 # Request/Response contracts by module
├── Security/             # Authorization policies
├── Services/             # Business logic (interfaces + implementations)
└── Program.cs            # App entry point, DI, middleware
```

### Key Backend Components

**Authentication & Authorization**
- JWT-based auth with access/refresh tokens (refresh token in HttpOnly cookie)
- ASP.NET Core Identity with custom `ApplicationUser`/`ApplicationRole`
- Role-based policies: `Admin`, `Manager`, `Staff`, `Customer`
- Key policies in `Security/AuthorizationPolicies.cs`

**Database** (26 tables per `plans/DATABASE_TABLE.md`)
- Identity: Users, Roles, UserRoles
- Commerce: Products, Categories, Units, Suppliers, Warehouses, Inventories
- Transactions: StockTransactions, PurchaseOrders, Orders, Payments, Deliveries
- Extras: Coupons, ProductReviews, Notifications, AuditLogs

**Services Pattern**
- Each domain has `I{Entity}Service` + `{Entity}Service` implementation
- Registered as Scoped in `Program.cs`
- Services use EF Core with `ApplicationDbContext`

### Frontend Structure

```
Frontend/
├── app/                    # Next.js App Router pages
│   ├── (user)/             # Customer-facing pages
│   └── admin/              # Admin dashboard pages
├── components/             # Shared UI components
├── providers/              # React Context providers (Auth, Cart)
├── services/               # API clients by domain
├── types/                  # TypeScript types for API
└── lib/                    # Utilities
```

**Frontend Auth Flow**
- `AuthProvider` in `providers/auth-provider.tsx` manages session via localStorage + refresh endpoint
- `services/auth/auth.service.ts` calls backend `/api/auth/*` endpoints
- Uses axios for HTTP requests

## Development Workflow

1. **Start Backend**: `dotnet run --project Backend/AgriStore.Api` (Swagger at `http://localhost:5274/swagger`)
2. **Start Frontend**: `npm run dev` in `Frontend/` (runs at `http://localhost:3000`)
3. **CORS**: Backend allows `http://localhost:3000` origin with credentials

## Key Configuration Files

- `Backend/AgriStore.Api/appsettings.Development.json` - Template only (use User Secrets for real values)
- `Backend/AgriStore.Api/AgriStore.Api.csproj` - .NET 10, packages: EF Core, Identity, JWT, Swagger, Npgsql
- `Frontend/package.json` - Next.js 16, React 19, Tailwind 4, axios, recharts
- `Frontend/tsconfig.json` - TypeScript config with path aliases

## Important Notes

- **No test project** currently exists (test folder only has bin/obj)
- **Database**: PostgreSQL required (local or external with SSL)
- **JWT**: Access token 15 min, refresh token 7 days (configurable)
- **Roles seeded on startup**: Admin, Manager, Staff, Customer with dev passwords
- **Product validation**: SKU format (uppercase, alphanumeric + ._-), prices, stock constraints enforced at DB level
- **Refresh tokens not stored in DB** - logout only clears cookie; token revocation not implemented

## Quy tắc kết thúc phiên làm việc (End of Session Rules)

Mỗi khi hoàn thành một phiên code (sau khi thực hiện xong yêu cầu của user):
1. **Kiểm tra theo phạm vi file đã sửa**:
   - Nếu có sửa đổi file ở **Backend** (`Backend/`): Chạy `dotnet build` tại thư mục `Backend/AgriStore.Api/`
   - Nếu có sửa đổi file ở **Frontend** (`Frontend/`): Chạy `npm run build` và `npm run lint` tại thư mục `Frontend/`
2. **Gọi agent `review-code`**:
   - Sau khi build/lint thành công (hoặc để kiểm tra lỗi nếu có), gọi subagent `review-code` qua tool `Agent` để kiểm tra lại toàn bộ code đã thay đổi.
   - Báo cáo kết quả review cho user trước khi kết thúc phiên.