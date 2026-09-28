using AgriStore.Api.DTOs.Auth;

namespace AgriStore.Api.Services;

public interface IAuthService
{
    Task<AuthServiceResult<RegisterResponse>> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken);

    Task<AuthServiceResult<AuthResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken);

    Task<AuthServiceResult<AuthResponse>> RefreshAsync(
        string? refreshToken,
        CancellationToken cancellationToken);
}

public sealed record AuthServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors,
    string? RefreshToken = null)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static AuthServiceResult<T> Success(T value, string refreshToken) =>
        new(value, StatusCodes.Status200OK, [], refreshToken);

    public static AuthServiceResult<T> Created(T value) =>
        new(value, StatusCodes.Status201Created, []);

    public static AuthServiceResult<T> Failure(int statusCode, params string[] errors) =>
        new(default, statusCode, errors);
}