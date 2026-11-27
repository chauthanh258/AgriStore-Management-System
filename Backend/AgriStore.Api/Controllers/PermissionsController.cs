using System.Security.Claims;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/permissions")]
[Authorize]
public sealed class PermissionsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType(typeof(IReadOnlyCollection<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<string>>> GetCurrentUserPermissions(
        CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var roleQuery =
            from userRole in dbContext.Set<ApplicationUserRole>()
            join role in dbContext.Roles on userRole.RoleId equals role.Id
            where userRole.UserId == userId
            select new { role.Id, role.NormalizedName };

        if (await roleQuery.AnyAsync(
                role => role.NormalizedName == SystemRoles.Admin.ToUpperInvariant(),
                cancellationToken))
        {
            return Ok(await dbContext.Permissions
                .OrderBy(permission => permission.Code)
                .Select(permission => permission.Code)
                .ToListAsync(cancellationToken));
        }

        var permissionCodes = await (
            from userRole in dbContext.Set<ApplicationUserRole>()
            join rolePermission in dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
            where userRole.UserId == userId
            orderby rolePermission.PermissionCode
            select rolePermission.PermissionCode)
            .Distinct()
            .ToListAsync(cancellationToken);

        return Ok(permissionCodes);
    }
}
