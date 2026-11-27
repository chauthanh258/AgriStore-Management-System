namespace AgriStore.Api.Domain.Entities;

public sealed class Permission
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required string Module { get; set; }
    public required string Action { get; set; }
}

public sealed class RolePermission
{
    public Guid RoleId { get; set; }
    public required string PermissionCode { get; set; }
}
