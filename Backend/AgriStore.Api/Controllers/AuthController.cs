using AgriStore.Api.DTOs.Auth;
using AgriStore.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStore.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IAuthService authService,
    IConfiguration configuration) : ControllerBase
{
    private string RefreshCookieName => configuration["Jwt:RefreshCookieName"] ?? "agristore_refresh_token";

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RegisterResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAsync(request, cancellationToken);
        return result.Succeeded ? StatusCode(result.StatusCode, result.Value) : Problem(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return Problem(result);
        }

        SetRefreshCookie(result.RefreshToken!);
        return Ok(result.Value);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken cancellationToken)
    {
        Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken);
        var result = await authService.RefreshAsync(refreshToken, cancellationToken);
        if (!result.Succeeded)
        {
            return Problem(result);
        }

        SetRefreshCookie(result.RefreshToken!);
        return Ok(result.Value);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(RefreshCookieName, GetCookieOptions());
        return NoContent();
    }

    private void SetRefreshCookie(string refreshToken)
    {
        Response.Cookies.Append(RefreshCookieName, refreshToken, GetCookieOptions());
    }

    private CookieOptions GetCookieOptions() => new()
    {
        HttpOnly = true,
        Secure = configuration.GetValue("Jwt:RefreshCookieSecure", false),
        SameSite = Enum.TryParse<SameSiteMode>(
            configuration["Jwt:RefreshCookieSameSite"],
            true,
            out var sameSite) ? sameSite : SameSiteMode.Lax,
        Path = "/api/auth",
        MaxAge = TimeSpan.FromDays(configuration.GetValue("Jwt:RefreshTokenDays", 7))
    };

    private ObjectResult Problem<T>(AuthServiceResult<T> result)
    {
        var details = new ProblemDetails
        {
            Status = result.StatusCode,
            Title = "Không thể xác thực tài khoản.",
            Detail = string.Join(" ", result.Errors),
            Instance = HttpContext.Request.Path
        };

        return StatusCode(result.StatusCode, details);
    }
}