using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Services;

public sealed class UserService(
    ApplicationDbContext dbContext,
    UserManager<ApplicationUser> userManager) : IUserService
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
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return UserServiceResult<UserResponse>.Failure(404, "Không tìm thấy user.");
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
        if (targetRoles.Contains("Admin", StringComparer.OrdinalIgnoreCase) &&
            !actorRoles.Contains("Admin", StringComparer.OrdinalIgnoreCase))
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
