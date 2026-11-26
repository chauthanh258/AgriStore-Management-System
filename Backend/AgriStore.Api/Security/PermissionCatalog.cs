using AgriStore.Api.Domain.Entities;

namespace AgriStore.Api.Security;

public static class PermissionCatalog
{
    public const string AssignRolePermissionsCode = "roles.assign_permissions";

    public static readonly IReadOnlyList<Permission> All =
    [
        new() { Code = "users.read", Name = "Xem người dùng", Description = "Xem danh sách và thông tin người dùng.", Module = "users", Action = "read" },
        new() { Code = "users.manage", Name = "Quản lý người dùng", Description = "Cập nhật và khóa/mở tài khoản người dùng.", Module = "users", Action = "manage" },
        new() { Code = "users.assign_roles", Name = "Gán vai trò", Description = "Thay đổi vai trò được gán cho người dùng.", Module = "users", Action = "assign_roles" },
        new() { Code = "roles.manage", Name = "Quản lý vai trò", Description = "Tạo, sửa, xóa vai trò và gán permission.", Module = "roles", Action = "manage" },
        new() { Code = AssignRolePermissionsCode, Name = "Gán permission cho vai trò", Description = "Thay đổi permission được gán cho role.", Module = "roles", Action = "assign_permissions" },
        new() { Code = "products.view", Name = "Xem sản phẩm", Description = "Xem danh sách và chi tiết sản phẩm.", Module = "products", Action = "view" },
        new() { Code = "products.manage", Name = "Quản lý sản phẩm", Description = "Tạo, sửa, xóa sản phẩm và quản lý hình ảnh.", Module = "products", Action = "manage" },
        new() { Code = "catalog.manage", Name = "Quản lý danh mục", Description = "Quản lý danh mục, đơn vị và duyệt đánh giá.", Module = "catalog", Action = "manage" },
        new() { Code = "operations.manage", Name = "Quản lý vận hành", Description = "Quản lý đơn hàng, kho, nhà cung cấp, giao hàng và thanh toán.", Module = "operations", Action = "manage" },
        new() { Code = "customers.manage", Name = "Quản lý khách hàng", Description = "Xem và quản lý khách hàng cùng sổ địa chỉ.", Module = "customers", Action = "manage" },
        new() { Code = "reports.view", Name = "Xem báo cáo", Description = "Xem báo cáo doanh thu, sản phẩm bán chạy và tồn kho.", Module = "reports", Action = "view" }
    ];

    public static readonly IReadOnlyDictionary<string, IReadOnlyCollection<string>> DefaultRolePermissions =
        new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["Manager"] =
            [
                "users.read", "users.manage", "products.view", "products.manage",
                "catalog.manage", "operations.manage", "customers.manage", "reports.view"
            ],
            ["Staff"] =
            [
                "operations.manage", "customers.manage", "reports.view"
            ],
            ["Customer"] =
            [
                "products.view"
            ]
        };
}

public static class PermissionPolicies
{
    public const string Prefix = "Permission:";
    public const string UsersRead = Prefix + "users.read";
    public const string UsersManage = Prefix + "users.manage";
    public const string AssignRoles = Prefix + "users.assign_roles";
    public const string ManageRoles = Prefix + "roles.manage";
    public const string AssignRolePermissions = Prefix + PermissionCatalog.AssignRolePermissionsCode;
    public const string ViewProducts = Prefix + "products.view";
    public const string ManageProducts = Prefix + "products.manage";
    public const string ManageCatalog = Prefix + "catalog.manage";
    public const string ManageOperations = Prefix + "operations.manage";
    public const string ManageCustomers = Prefix + "customers.manage";
    public const string ViewReports = Prefix + "reports.view";
}
