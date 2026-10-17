using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Roles;
using AgriStore.Api.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class RoleService(
    RoleManager<ApplicationRole> roleManager,
    UserManager<ApplicationUser> userManager) : IRoleService
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

    private static string? NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? null : name.Trim();

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();
}