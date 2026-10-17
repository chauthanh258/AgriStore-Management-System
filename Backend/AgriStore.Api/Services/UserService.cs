using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Users;
using AgriStore.Api.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class UserService(
    ApplicationDbContext dbContext,
    UserManager<ApplicationUser> userManager,
    RoleManager<ApplicationRole> roleManager) : IUserService
{
    private const int MaxPageSize = 100;

    public async Task<UserListResponse> GetPagedAsync(
        UserListQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var usersQuery = dbContext.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            usersQuery = usersQuery.Where(user =>
                (user.UserName != null && user.UserName.Contains(search)) ||
                (user.Email != null && user.Email.Contains(search)) ||
                user.FullName.Contains(search));
        }

        if (query.IsActive.HasValue)
        {
            usersQuery = usersQuery.Where(user => user.IsActive == query.IsActive.Value);
        }

        var totalCount = await usersQuery.CountAsync(cancellationToken);
        var users = await usersQuery
            .OrderBy(user => user.FullName)
            .ThenBy(user => user.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var responses = await MapUsersAsync(users);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new UserListResponse(responses, page, pageSize, totalCount, totalPages);
    }

    public async Task<UserResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return user is null ? null : await MapUserAsync(user);
    }

    public async Task<UserServiceResult<UserResponse>> UpdateAsync(
        Guid id,
        UpdateUserRequest request,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return UserServiceResult<UserResponse>.Failure(404, "Không tìm thấy user.");
        }

        var targetRoles = await userManager.GetRolesAsync(user);
        var actorIsAdmin = actorRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase);
        if (targetRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase) && !actorIsAdmin)
        {
            return UserServiceResult<UserResponse>.Failure(403, "Manager không được cập nhật tài khoản Admin.");
        }

        if (request.Roles is not null && !actorIsAdmin)
        {
            return UserServiceResult<UserResponse>.Failure(403, "Chỉ Admin được thay đổi role của user.");
        }

        var requestedRoles = request.Roles is null
            ? targetRoles.ToArray()
            : request.Roles
                .Where(role => !string.IsNullOrWhiteSpace(role))
                .Select(role => role.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        foreach (var role in requestedRoles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                return UserServiceResult<UserResponse>.Failure(400, $"Role '{role}' không tồn tại.");
            }
        }

        if (!actorIsAdmin && requestedRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase))
        {
            return UserServiceResult<UserResponse>.Failure(403, "Manager không được gán role Admin.");
        }

        var normalizedEmail = userManager.NormalizeEmail(request.Email);
        var emailInUse = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(item => item.Id != id && item.NormalizedEmail == normalizedEmail, cancellationToken);

        if (emailInUse)
        {
            return UserServiceResult<UserResponse>.Failure(409, "Email đã được sử dụng bởi user khác.");
        }

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        user.Avatar = string.IsNullOrWhiteSpace(request.Avatar) ? null : request.Avatar.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        var emailResult = await userManager.SetEmailAsync(user, request.Email.Trim());
        if (!emailResult.Succeeded)
        {
            return UserServiceResult<UserResponse>.Failure(400, emailResult.Errors.Select(error => error.Description).ToArray());
        }

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return UserServiceResult<UserResponse>.Failure(400, updateResult.Errors.Select(error => error.Description).ToArray());
        }

        var rolesToRemove = targetRoles.Except(requestedRoles, StringComparer.OrdinalIgnoreCase).ToArray();
        var rolesToAdd = requestedRoles.Except(targetRoles, StringComparer.OrdinalIgnoreCase).ToArray();
        if (rolesToRemove.Length > 0)
        {
            var removeRolesResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeRolesResult.Succeeded)
            {
                return UserServiceResult<UserResponse>.Failure(400, removeRolesResult.Errors.Select(error => error.Description).ToArray());
            }
        }

        if (rolesToAdd.Length > 0)
        {
            var addRolesResult = await userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addRolesResult.Succeeded)
            {
                return UserServiceResult<UserResponse>.Failure(400, addRolesResult.Errors.Select(error => error.Description).ToArray());
            }
        }

        if (rolesToRemove.Length > 0 || rolesToAdd.Length > 0)
        {
            var stampResult = await userManager.UpdateSecurityStampAsync(user);
            if (!stampResult.Succeeded)
            {
                return UserServiceResult<UserResponse>.Failure(400, stampResult.Errors.Select(error => error.Description).ToArray());
            }
        }

        return UserServiceResult<UserResponse>.Success(await MapUserAsync(user));
    }

    public async Task<UserServiceResult<UserResponse>> SetActiveAsync(
        Guid id,
        bool isActive,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken)
    {
        if (id == actorId)
        {
            return UserServiceResult<UserResponse>.Failure(400, "Không thể tự khóa hoặc mở khóa tài khoản của chính mình.");
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return UserServiceResult<UserResponse>.Failure(404, "Không tìm thấy user.");
        }

        var targetRoles = await userManager.GetRolesAsync(user);
        if (targetRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase) &&
            !actorRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase))
        {
            return UserServiceResult<UserResponse>.Failure(403, "Manager không được thay đổi trạng thái tài khoản Admin.");
        }

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return UserServiceResult<UserResponse>.Failure(400, updateResult.Errors.Select(error => error.Description).ToArray());
        }

        if (!isActive)
        {
            var stampResult = await userManager.UpdateSecurityStampAsync(user);
            if (!stampResult.Succeeded)
            {
                return UserServiceResult<UserResponse>.Failure(400, stampResult.Errors.Select(error => error.Description).ToArray());
            }
        }

        return UserServiceResult<UserResponse>.Success(await MapUserAsync(user));
    }

    public async Task<UserServiceResult<UserRolesResponse>> GetRolesAsync(
        Guid id,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        return user is null
            ? UserServiceResult<UserRolesResponse>.Failure(404, "Không tìm thấy user.")
            : UserServiceResult<UserRolesResponse>.Success(new UserRolesResponse(
                user.Id,
                (await userManager.GetRolesAsync(user)).ToArray()));
    }

    public async Task<UserServiceResult<UserRolesResponse>> ReplaceRolesAsync(
        Guid id,
        IReadOnlyCollection<string> roles,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return UserServiceResult<UserRolesResponse>.Failure(404, "Không tìm thấy user.");
        }

        var requestedRoles = NormalizeRoles(roles);
        if (requestedRoles.Length == 0)
        {
            return UserServiceResult<UserRolesResponse>.Failure(400, "User phải có ít nhất một role.");
        }

        var validation = await ValidateRoleChangeAsync(user, requestedRoles, actorRoles);
        if (validation is not null)
        {
            return validation;
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        var rolesToRemove = currentRoles.Except(requestedRoles, StringComparer.OrdinalIgnoreCase).ToArray();
        var rolesToAdd = requestedRoles.Except(currentRoles, StringComparer.OrdinalIgnoreCase).ToArray();
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var result = await ApplyRoleChangesAsync(user, rolesToRemove, rolesToAdd);
        if (!result.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return result;
        }

        await transaction.CommitAsync(cancellationToken);
        return UserServiceResult<UserRolesResponse>.Success(new UserRolesResponse(user.Id, requestedRoles));
    }

    public async Task<UserServiceResult<UserRolesResponse>> AddRoleAsync(
        Guid id,
        string roleName,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return UserServiceResult<UserRolesResponse>.Failure(404, "Không tìm thấy user.");
        }

        var normalizedRole = roleName.Trim();
        if (!await roleManager.RoleExistsAsync(normalizedRole))
        {
            return UserServiceResult<UserRolesResponse>.Failure(404, "Không tìm thấy role.");
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Contains(normalizedRole, StringComparer.OrdinalIgnoreCase))
        {
            return UserServiceResult<UserRolesResponse>.Failure(409, "User đã được gán role này.");
        }

        var validation = await ValidateRoleChangeAsync(user, [.. currentRoles, normalizedRole], actorRoles);
        if (validation is not null)
        {
            return validation;
        }

        var result = await ApplyRoleChangesAsync(user, [], [normalizedRole]);
        return result.Succeeded
            ? UserServiceResult<UserRolesResponse>.Success(new UserRolesResponse(
                user.Id,
                [.. currentRoles, normalizedRole]))
            : result;
    }

    public async Task<UserServiceResult<UserRolesResponse>> RemoveRoleAsync(
        Guid id,
        string roleName,
        Guid actorId,
        IReadOnlyCollection<string> actorRoles,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return UserServiceResult<UserRolesResponse>.Failure(404, "Không tìm thấy user.");
        }

        var role = await roleManager.FindByNameAsync(roleName.Trim());
        if (role is null)
        {
            return UserServiceResult<UserRolesResponse>.Failure(404, "Không tìm thấy role.");
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        var currentRole = currentRoles.FirstOrDefault(item =>
            string.Equals(item, role.Name, StringComparison.OrdinalIgnoreCase));
        if (currentRole is null)
        {
            return UserServiceResult<UserRolesResponse>.Failure(404, "User chưa được gán role này.");
        }

        if (currentRoles.Count <= 1)
        {
            return UserServiceResult<UserRolesResponse>.Failure(400, "Không thể xóa role cuối cùng của user.");
        }

        if (string.Equals(role.Name, SystemRoles.Admin, StringComparison.OrdinalIgnoreCase) &&
            (await userManager.GetUsersInRoleAsync(role.Name!)).Count <= 1)
        {
            return UserServiceResult<UserRolesResponse>.Failure(409, "Không thể xóa role Admin cuối cùng.");
        }

        var result = await ApplyRoleChangesAsync(user, [currentRole], []);
        return result.Succeeded
            ? UserServiceResult<UserRolesResponse>.Success(new UserRolesResponse(
                user.Id,
                currentRoles.Where(item => !string.Equals(item, currentRole, StringComparison.OrdinalIgnoreCase)).ToArray()))
            : result;
    }

    private async Task<UserServiceResult<UserRolesResponse>?> ValidateRoleChangeAsync(
        ApplicationUser user,
        IReadOnlyCollection<string> requestedRoles,
        IReadOnlyCollection<string> actorRoles)
    {
        foreach (var role in requestedRoles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                return UserServiceResult<UserRolesResponse>.Failure(404, $"Không tìm thấy role '{role}'.");
            }
        }

        var actorIsAdmin = actorRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase);
        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase) && !actorIsAdmin ||
            requestedRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase) && !actorIsAdmin)
        {
            return UserServiceResult<UserRolesResponse>.Failure(403, "Chỉ Admin được quản lý role Admin.");
        }

        var removingAdmin = currentRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase) &&
            !requestedRoles.Contains(SystemRoles.Admin, StringComparer.OrdinalIgnoreCase);
        if (removingAdmin)
        {
            var adminRole = await roleManager.FindByNameAsync(SystemRoles.Admin);
            if (adminRole is not null && (await userManager.GetUsersInRoleAsync(adminRole.Name!)).Count <= 1)
            {
                return UserServiceResult<UserRolesResponse>.Failure(409, "Không thể xóa role Admin cuối cùng.");
            }
        }

        return null;
    }

    private async Task<UserServiceResult<UserRolesResponse>> ApplyRoleChangesAsync(
        ApplicationUser user,
        IReadOnlyCollection<string> rolesToRemove,
        IReadOnlyCollection<string> rolesToAdd)
    {
        if (rolesToRemove.Count > 0)
        {
            var removeResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeResult.Succeeded)
            {
                return UserServiceResult<UserRolesResponse>.Failure(400, removeResult.Errors.Select(error => error.Description).ToArray());
            }
        }

        if (rolesToAdd.Count > 0)
        {
            var addResult = await userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addResult.Succeeded)
            {
                return UserServiceResult<UserRolesResponse>.Failure(400, addResult.Errors.Select(error => error.Description).ToArray());
            }
        }

        if (rolesToRemove.Count > 0 || rolesToAdd.Count > 0)
        {
            var stampResult = await userManager.UpdateSecurityStampAsync(user);
            if (!stampResult.Succeeded)
            {
                return UserServiceResult<UserRolesResponse>.Failure(400, stampResult.Errors.Select(error => error.Description).ToArray());
            }
        }

        return UserServiceResult<UserRolesResponse>.Success(new UserRolesResponse(user.Id, []));
    }

    private static string[] NormalizeRoles(IEnumerable<string> roles) => roles
        .Where(role => !string.IsNullOrWhiteSpace(role))
        .Select(role => role.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    private async Task<IReadOnlyCollection<UserResponse>> MapUsersAsync(IEnumerable<ApplicationUser> users)
    {
        var responses = new List<UserResponse>();
        foreach (var user in users)
        {
            responses.Add(await MapUserAsync(user));
        }

        return responses;
    }

    private async Task<UserResponse> MapUserAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        return new UserResponse(
            user.Id,
            user.UserName,
            user.Email,
            user.FullName,
            user.PhoneNumber,
            user.Avatar,
            user.IsActive,
            new DateTimeOffset(DateTime.SpecifyKind(user.CreatedAt, DateTimeKind.Utc)),
            user.UpdatedAt.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(user.UpdatedAt.Value, DateTimeKind.Utc))
                : null,
            roles.ToArray());
    }
}
