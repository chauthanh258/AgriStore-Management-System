using AgriStore.Api.Domain.Entities;
using AgriStore.Api.Data;
using AgriStore.Api.DTOs.Roles;
using AgriStore.Api.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class RoleService(
    RoleManager<ApplicationRole> roleManager,
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext dbContext) : IRoleService
{
    public async Task<IReadOnlyCollection<RoleResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var roles = await roleManager.Roles
            .OrderBy(role => role.Name)
            .ToListAsync(cancellationToken);
        return await MapRolesAsync(roles, cancellationToken);
    }

    public async Task<RoleResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());
        return role is null ? null : await MapRoleAsync(role);
    }

    public async Task<RoleServiceResult<RoleResponse>> CreateAsync(
        CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var name = NormalizeName(request.Name);
        if (name is null)
        {
            return RoleServiceResult<RoleResponse>.Failure(400, "Tên role không được để trống.");
        }

        if (await roleManager.RoleExistsAsync(name))
        {
            return RoleServiceResult<RoleResponse>.Failure(409, "Tên role đã tồn tại.");
        }

        var role = new ApplicationRole
        {
            Name = name,
            Description = NormalizeDescription(request.Description)
        };
        var result = await roleManager.CreateAsync(role);
        if (!result.Succeeded)
        {
            return RoleServiceResult<RoleResponse>.Failure(400, result.Errors.Select(error => error.Description).ToArray());
        }

        return RoleServiceResult<RoleResponse>.Created(await MapRoleAsync(role));
    }

    public async Task<RoleServiceResult<RoleResponse>> UpdateAsync(
        Guid id,
        UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());
        if (role is null)
        {
            return RoleServiceResult<RoleResponse>.Failure(404, "Không tìm thấy role.");
        }

        var name = NormalizeName(request.Name);
        if (name is null)
        {
            return RoleServiceResult<RoleResponse>.Failure(400, "Tên role không được để trống.");
        }

        if (SystemRoles.Protected.Contains(role.Name ?? string.Empty) &&
            !string.Equals(role.Name, name, StringComparison.OrdinalIgnoreCase))
        {
            return RoleServiceResult<RoleResponse>.Failure(403, "Không được đổi tên role hệ thống.");
        }

        if (SystemRoles.Protected.Contains(name) &&
            !string.Equals(role.Name, name, StringComparison.OrdinalIgnoreCase))
        {
            return RoleServiceResult<RoleResponse>.Failure(403, "Không được đổi tên role tùy chỉnh thành role hệ thống.");
        }

        var existing = await roleManager.FindByNameAsync(name);
        if (existing is not null && existing.Id != id)
        {
            return RoleServiceResult<RoleResponse>.Failure(409, "Tên role đã tồn tại.");
        }

        role.Name = name;
        role.Description = NormalizeDescription(request.Description);
        var result = await roleManager.UpdateAsync(role);
        if (!result.Succeeded)
        {
            return RoleServiceResult<RoleResponse>.Failure(400, result.Errors.Select(error => error.Description).ToArray());
        }

        return RoleServiceResult<RoleResponse>.Success(await MapRoleAsync(role));
    }

    public async Task<RoleServiceResult<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());
        if (role is null)
        {
            return RoleServiceResult<bool>.Failure(404, "Không tìm thấy role.");
        }

        if (SystemRoles.Protected.Contains(role.Name ?? string.Empty))
        {
            return RoleServiceResult<bool>.Failure(403, "Không được xóa role hệ thống.");
        }

        var usersInRole = await userManager.GetUsersInRoleAsync(role.Name!);
        if (usersInRole.Count > 0)
        {
            return RoleServiceResult<bool>.Failure(409, "Không thể xóa role đang được gán cho user.");
        }

        var result = await roleManager.DeleteAsync(role);
        if (!result.Succeeded)
        {
            return RoleServiceResult<bool>.Failure(400, result.Errors.Select(error => error.Description).ToArray());
        }

        return RoleServiceResult<bool>.Success(true);
    }

    public async Task<IReadOnlyCollection<PermissionResponse>> GetPermissionsAsync(
        CancellationToken cancellationToken)
    {
        return await dbContext.Permissions
            .OrderBy(permission => permission.Module)
            .ThenBy(permission => permission.Action)
            .Select(permission => new PermissionResponse(
                permission.Code,
                permission.Name,
                permission.Description,
                permission.Module,
                permission.Action))
            .ToListAsync(cancellationToken);
    }

    public async Task<RoleServiceResult<RolePermissionsResponse>> GetPermissionsForRoleAsync(
        Guid roleId,
        CancellationToken cancellationToken)
    {
        var role = await roleManager.FindByIdAsync(roleId.ToString());
        if (role is null)
        {
            return RoleServiceResult<RolePermissionsResponse>.Failure(404, "Không tìm thấy role.");
        }

        var permissionCodes = await dbContext.RolePermissions
            .Where(rolePermission => rolePermission.RoleId == roleId)
            .OrderBy(rolePermission => rolePermission.PermissionCode)
            .Select(rolePermission => rolePermission.PermissionCode)
            .ToListAsync(cancellationToken);

        return RoleServiceResult<RolePermissionsResponse>.Success(MapRolePermissions(role, permissionCodes));
    }

    public async Task<RoleServiceResult<RolePermissionsResponse>> ReplacePermissionsAsync(
        Guid roleId,
        IReadOnlyCollection<string> permissionCodes,
        CancellationToken cancellationToken)
    {
        var role = await roleManager.FindByIdAsync(roleId.ToString());
        if (role is null)
        {
            return RoleServiceResult<RolePermissionsResponse>.Failure(404, "Không tìm thấy role.");
        }

        if (string.Equals(role.Name, SystemRoles.Admin, StringComparison.OrdinalIgnoreCase))
        {
            return RoleServiceResult<RolePermissionsResponse>.Failure(
                403,
                "Role Admin có toàn quyền và không cần gán permission.");
        }

        var normalizedCodes = permissionCodes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim().ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (normalizedCodes.Contains(PermissionCatalog.AssignRolePermissionsCode, StringComparer.Ordinal))
        {
            return RoleServiceResult<RolePermissionsResponse>.Failure(
                403,
                "Chỉ Admin mới được quyền gán permission cho role.");
        }

        if (normalizedCodes.Length != permissionCodes.Count)
        {
            return RoleServiceResult<RolePermissionsResponse>.Failure(
                400,
                "Danh sách permission chứa mã rỗng hoặc trùng lặp.");
        }

        var validCodes = await dbContext.Permissions
            .Where(permission => normalizedCodes.Contains(permission.Code))
            .Select(permission => permission.Code)
            .ToListAsync(cancellationToken);
        if (validCodes.Count != normalizedCodes.Length)
        {
            return RoleServiceResult<RolePermissionsResponse>.Failure(
                400,
                "Danh sách chứa permission không tồn tại.");
        }

        var current = await dbContext.RolePermissions
            .Where(rolePermission => rolePermission.RoleId == roleId)
            .ToListAsync(cancellationToken);
        var requestedCodeSet = normalizedCodes.ToHashSet(StringComparer.Ordinal);
        var currentCodeSet = current
            .Select(rolePermission => rolePermission.PermissionCode)
            .ToHashSet(StringComparer.Ordinal);
        dbContext.RolePermissions.RemoveRange(current.Where(rolePermission =>
            !requestedCodeSet.Contains(rolePermission.PermissionCode)));
        dbContext.RolePermissions.AddRange(normalizedCodes
            .Where(code => !currentCodeSet.Contains(code))
            .Select(code =>
                new RolePermission { RoleId = roleId, PermissionCode = code }));
        await dbContext.SaveChangesAsync(cancellationToken);

        return RoleServiceResult<RolePermissionsResponse>.Success(MapRolePermissions(role, normalizedCodes));
    }

    private async Task<IReadOnlyCollection<RoleResponse>> MapRolesAsync(
        IEnumerable<ApplicationRole> roles,
        CancellationToken cancellationToken)
    {
        var responses = new List<RoleResponse>();
        foreach (var role in roles)
        {
            cancellationToken.ThrowIfCancellationRequested();
            responses.Add(await MapRoleAsync(role));
        }

        return responses;
    }

    private async Task<RoleResponse> MapRoleAsync(ApplicationRole role)
    {
        var userCount = role.Name is null ? 0 : (await userManager.GetUsersInRoleAsync(role.Name)).Count;
        return new RoleResponse(
            role.Id,
            role.Name!,
            role.Description,
            new DateTimeOffset(DateTime.SpecifyKind(role.CreatedAt, DateTimeKind.Utc)),
            userCount,
            SystemRoles.Protected.Contains(role.Name ?? string.Empty));
    }

    private static RolePermissionsResponse MapRolePermissions(
        ApplicationRole role,
        IReadOnlyCollection<string> permissionCodes) =>
        new(
            role.Id,
            role.Name!,
            permissionCodes,
            SystemRoles.Protected.Contains(role.Name ?? string.Empty),
            string.Equals(role.Name, SystemRoles.Admin, StringComparison.OrdinalIgnoreCase));

    private static string? NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? null : name.Trim();

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();
}