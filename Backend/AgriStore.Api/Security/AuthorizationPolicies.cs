namespace AgriStore.Api.Security;

public static class AuthorizationPolicies
{
    public const string ManageRoles = PermissionPolicies.ManageRoles;
    public const string ManageUsers = PermissionPolicies.UsersManage;
    public const string AssignRoles = PermissionPolicies.AssignRoles;
    public const string ViewProducts = PermissionPolicies.ViewProducts;
    public const string ManageProducts = PermissionPolicies.ManageProducts;
    public const string ManageOperations = PermissionPolicies.ManageOperations;
    public const string ManageCatalog = PermissionPolicies.ManageCatalog;
    public const string ManageCustomers = PermissionPolicies.ManageCustomers;
    public const string ViewReports = PermissionPolicies.ViewReports;
}

public static class SystemRoles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Staff = "Staff";
    public const string Customer = "Customer";

    public static readonly IReadOnlySet<string> Protected = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        Admin,
        Manager,
        Staff,
        Customer
    };
}