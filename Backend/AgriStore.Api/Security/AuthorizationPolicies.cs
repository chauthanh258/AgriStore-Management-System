namespace AgriStore.Api.Security;

public static class AuthorizationPolicies
{
    public const string ManageRoles = "ManageRoles";
    public const string ManageUsers = "ManageUsers";
    public const string AssignRoles = "AssignRoles";
    public const string ViewProducts = "ViewProducts";
    public const string ManageProducts = "ManageProducts";
    public const string ManageOperations = "ManageOperations";
    public const string ManageCatalog = "ManageCatalog";
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