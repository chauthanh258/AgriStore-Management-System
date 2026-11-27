using AgriStore.Api.DTOs.Roles;
using AgriStore.Api.Security;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize(Policy = AuthorizationPolicies.ManageRoles)]
public sealed class RolesController(IRoleService roleService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<RoleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<RoleResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await roleService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoleResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var role = await roleService.GetByIdAsync(id, cancellationToken);
        return role is null ? NotFound() : Ok(role);
    }

    [HttpGet("permissions")]
    [ProducesResponseType(typeof(IReadOnlyCollection<PermissionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<PermissionResponse>>> GetPermissions(
        CancellationToken cancellationToken)
    {
        return Ok(await roleService.GetPermissionsAsync(cancellationToken));
    }

    [HttpGet("{id:guid}/permissions")]
    [ProducesResponseType(typeof(RolePermissionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RolePermissionsResponse>> GetPermissions(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await roleService.GetPermissionsForRoleAsync(id, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPut("{id:guid}/permissions")]
    [Authorize(Policy = PermissionPolicies.AssignRolePermissions)]
    [ProducesResponseType(typeof(RolePermissionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RolePermissionsResponse>> ReplacePermissions(
        Guid id,
        UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await roleService.ReplacePermissionsAsync(id, request.PermissionCodes, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RoleResponse>> Create(
        CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await roleService.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? StatusCode(result.StatusCode, result.Value)
            : Problem(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(RoleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RoleResponse>> Update(
        Guid id,
        UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await roleService.UpdateAsync(id, request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await roleService.DeleteAsync(id, cancellationToken);
        return result.Succeeded ? NoContent() : Problem(result);
    }

    private ObjectResult Problem<T>(RoleServiceResult<T> result)
    {
        return StatusCode(result.StatusCode, new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể hoàn tất yêu cầu quản lý role.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        });
    }
}