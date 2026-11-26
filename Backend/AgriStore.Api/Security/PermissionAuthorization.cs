using System.Security.Claims;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AgriStore.Api.Security;

public sealed record PermissionRequirement(string PermissionCode) : IAuthorizationRequirement;

public sealed class PermissionAuthorizationHandler(
    ApplicationDbContext dbContext,
    IHttpContextAccessor httpContextAccessor) : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userIdValue = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return;
        }

        var cancellationToken = httpContextAccessor.HttpContext?.RequestAborted ?? CancellationToken.None;
        var hasAdminRole = await (
            from userRole in dbContext.Set<ApplicationUserRole>()
            join role in dbContext.Roles on userRole.RoleId equals role.Id
            where userRole.UserId == userId && role.NormalizedName == SystemRoles.Admin.ToUpperInvariant()
            select userRole.UserId)
            .AnyAsync(cancellationToken);

        if (hasAdminRole)
        {
            context.Succeed(requirement);
            return;
        }

        if (requirement.PermissionCode == PermissionCatalog.AssignRolePermissionsCode)
        {
            return;
        }

        var hasPermission = await (
            from userRole in dbContext.Set<ApplicationUserRole>()
            join rolePermission in dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
            where userRole.UserId == userId && rolePermission.PermissionCode == requirement.PermissionCode
            select rolePermission.RoleId)
            .AnyAsync(cancellationToken);

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}

public sealed class PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback = new(options);

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() =>
        _fallback.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() =>
        _fallback.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(PermissionPolicies.Prefix, StringComparison.OrdinalIgnoreCase))
        {
            return _fallback.GetPolicyAsync(policyName);
        }

        var permissionCode = policyName[PermissionPolicies.Prefix.Length..];
        if (string.IsNullOrWhiteSpace(permissionCode))
        {
            return Task.FromResult<AuthorizationPolicy?>(null);
        }

        var policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new PermissionRequirement(permissionCode))
            .Build();
        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}
