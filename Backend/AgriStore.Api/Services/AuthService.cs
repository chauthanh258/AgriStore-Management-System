using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace AgriStore.Api.Services;

public sealed class AuthService(
    IConfiguration configuration,
    UserManager<ApplicationUser> userManager,
    RoleManager<ApplicationRole> roleManager) : IAuthService
{
    private const string CustomerRole = "Customer";
    private const string TokenTypeClaim = "token_type";
    private const string AccessTokenType = "access";
    private const string RefreshTokenType = "refresh";

    public async Task<AuthServiceResult<RegisterResponse>> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        var existingUser = await userManager.FindByEmailAsync(email);
        if (existingUser is not null)
        {
            return AuthServiceResult<RegisterResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Email đã được sử dụng.");
        }

        if (!await roleManager.RoleExistsAsync(CustomerRole))
        {
            return AuthServiceResult<RegisterResponse>.Failure(
                StatusCodes.Status500InternalServerError,
                "Role Customer chưa được khởi tạo.");
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = request.FullName.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber)
                ? null
                : request.PhoneNumber.Trim(),
            IsActive = true
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return AuthServiceResult<RegisterResponse>.Failure(
                StatusCodes.Status400BadRequest,
                createResult.Errors.Select(error => error.Description).ToArray());
        }

        var roleResult = await userManager.AddToRoleAsync(user, CustomerRole);
        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return AuthServiceResult<RegisterResponse>.Failure(
                StatusCodes.Status500InternalServerError,
                roleResult.Errors.Select(error => error.Description).ToArray());
        }

        return AuthServiceResult<RegisterResponse>.Created(new RegisterResponse(
            user.Id,
            user.Email!,
            user.FullName,
            [CustomerRole]));
    }

    public async Task<AuthServiceResult<AuthResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null || !user.IsActive || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return AuthServiceResult<AuthResponse>.Failure(
                StatusCodes.Status401Unauthorized,
                "Email hoặc mật khẩu không chính xác.");
        }

        var roles = await userManager.GetRolesAsync(user);
        return CreateTokenResult(user, roles);
    }

    public async Task<AuthServiceResult<AuthResponse>> RefreshAsync(
        string? refreshToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return AuthServiceResult<AuthResponse>.Failure(
                StatusCodes.Status401Unauthorized,
                "Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        ClaimsPrincipal principal;
        try
        {
            principal = new JwtSecurityTokenHandler().ValidateToken(
                refreshToken,
                GetValidationParameters(),
                out _);
        }
        catch (SecurityTokenException)
        {
            return AuthServiceResult<AuthResponse>.Failure(
                StatusCodes.Status401Unauthorized,
                "Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        if (principal.FindFirstValue(TokenTypeClaim) != RefreshTokenType ||
            !Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
        {
            return AuthServiceResult<AuthResponse>.Failure(
                StatusCodes.Status401Unauthorized,
                "Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null || !user.IsActive)
        {
            return AuthServiceResult<AuthResponse>.Failure(
                StatusCodes.Status401Unauthorized,
                "Refresh token không hợp lệ hoặc đã hết hạn.");
        }

        var roles = await userManager.GetRolesAsync(user);
        return CreateTokenResult(user, roles);
    }

    private AuthServiceResult<AuthResponse> CreateTokenResult(
        ApplicationUser user,
        IList<string> roles)
    {
        var now = DateTime.UtcNow;
        var accessLifetime = GetAccessTokenLifetime();
        var accessExpiresAt = now.Add(accessLifetime);
        var accessToken = CreateToken(user, roles, AccessTokenType, accessExpiresAt);
        var refreshExpiresAt = now.Add(GetRefreshTokenLifetime());
        var refreshToken = CreateToken(user, roles, RefreshTokenType, refreshExpiresAt);

        return AuthServiceResult<AuthResponse>.Success(
            new AuthResponse(
                accessToken,
                new DateTimeOffset(accessExpiresAt, TimeSpan.Zero),
                user.Id,
                user.Email!,
                user.FullName,
                roles.ToArray()),
            refreshToken);
    }

    private string CreateToken(
        ApplicationUser user,
        IEnumerable<string> roles,
        string tokenType,
        DateTime expiresAt)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(ClaimTypes.Email, user.Email!),
            new(TokenTypeClaim, tokenType),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey())),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private TokenValidationParameters GetValidationParameters() => new()
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey())),
        ValidateIssuer = true,
        ValidIssuer = configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    private string GetJwtKey() => configuration["Jwt:Key"]
        ?? throw new InvalidOperationException("Jwt:Key chưa được cấu hình.");

    private TimeSpan GetAccessTokenLifetime() =>
        TimeSpan.FromMinutes(configuration.GetValue("Jwt:AccessTokenMinutes", 15));

    private TimeSpan GetRefreshTokenLifetime() =>
        TimeSpan.FromDays(configuration.GetValue("Jwt:RefreshTokenDays", 7));
}