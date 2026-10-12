using System.Security.Claims;
using AgriStore.Api.DTOs.Users;
using AgriStore.Api.Security;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

/// <summary>API quản lý tài khoản người dùng.</summary>
[ApiController]
[Route("api/users")]
// [Authorize(Policy = AuthorizationPolicies.ManageUsers)]
public sealed class UsersController(IUserService userService) : ControllerBase
{
    /// <summary>Lấy danh sách user theo điều kiện tìm kiếm và phân trang.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(UserListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserListResponse>> GetAll(
        [FromQuery] UserListQuery query,
        CancellationToken cancellationToken)
    {
        return Ok(await userService.GetPagedAsync(query, cancellationToken));
    }

    /// <summary>Lấy thông tin chi tiết một user.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await userService.GetByIdAsync(id, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    /// <summary>Cập nhật thông tin cơ bản của một user.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> Update(
        Guid id,
        UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var actorIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(actorIdValue, out var actorId))
        {
            return Unauthorized();
        }

        var actorRoles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray();
        var result = await userService.UpdateAsync(id, request, actorId, actorRoles, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    /// <summary>Khóa hoặc mở khóa một user.</summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> SetStatus(
        Guid id,
        UserStatusRequest request,
        CancellationToken cancellationToken)
    {
        var actorIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(actorIdValue, out var actorId))
        {
            return Unauthorized();
        }

        var actorRoles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray();
        var result = await userService.SetActiveAsync(id, request.IsActive, actorId, actorRoles, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpGet("{id:guid}/roles")]
    // [Authorize(Policy = AuthorizationPolicies.AssignRoles)]
    [ProducesResponseType(typeof(UserRolesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserRolesResponse>> GetRoles(Guid id, CancellationToken cancellationToken)
    {
        var result = await userService.GetRolesAsync(id, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPut("{id:guid}/roles")]
    // [Authorize(Policy = AuthorizationPolicies.AssignRoles)]
    [ProducesResponseType(typeof(UserRolesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserRolesResponse>> ReplaceRoles(
        Guid id,
        UpdateUserRolesRequest request,
        CancellationToken cancellationToken)
    {
        var (actorId, actorRoles) = GetActor();
        if (actorId is null)
        {
            return Unauthorized();
        }

        var result = await userService.ReplaceRolesAsync(id, request.Roles, actorId.Value, actorRoles, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPost("{id:guid}/roles/{roleName}")]
    // [Authorize(Policy = AuthorizationPolicies.AssignRoles)]
    [ProducesResponseType(typeof(UserRolesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserRolesResponse>> AddRole(
        Guid id,
        string roleName,
        CancellationToken cancellationToken)
    {
        var (actorId, actorRoles) = GetActor();
        if (actorId is null)
        {
            return Unauthorized();
        }

        var result = await userService.AddRoleAsync(id, roleName, actorId.Value, actorRoles, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpDelete("{id:guid}/roles/{roleName}")]
    // [Authorize(Policy = AuthorizationPolicies.AssignRoles)]
    [ProducesResponseType(typeof(UserRolesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserRolesResponse>> RemoveRole(
        Guid id,
        string roleName,
        CancellationToken cancellationToken)
    {
        var (actorId, actorRoles) = GetActor();
        if (actorId is null)
        {
            return Unauthorized();
        }

        var result = await userService.RemoveRoleAsync(id, roleName, actorId.Value, actorRoles, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    private (Guid? ActorId, IReadOnlyCollection<string> Roles) GetActor()
    {
        var actorIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return (Guid.TryParse(actorIdValue, out var actorId) ? actorId : null,
            User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray());
    }

    private ObjectResult Problem(UserServiceResult<UserResponse> result)
    {
        var details = new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể hoàn tất yêu cầu quản lý user.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        };

        return StatusCode(result.StatusCode, details);
    }

    private ObjectResult Problem<T>(UserServiceResult<T> result)
    {
        return StatusCode(result.StatusCode, new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể hoàn tất yêu cầu quản lý user.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        });
    }
}
