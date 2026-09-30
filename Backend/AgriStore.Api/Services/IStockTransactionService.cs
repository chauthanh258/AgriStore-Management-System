using AgriStore.Api.DTOs.Inventories;

namespace AgriStore.Api.Services;

public interface IStockTransactionService
{
    Task<StockTransactionServiceResult<StockTransactionResponse>> CreateAsync(
        CreateStockTransactionRequest request,
        Guid? createdBy,
        CancellationToken cancellationToken);

    Task<StockTransactionResponse?> GetByIdAsync(
        Guid batchId,
        CancellationToken cancellationToken);

    Task<StockTransactionListResponse> GetPagedAsync(
        StockTransactionQuery query,
        CancellationToken cancellationToken);
}

public sealed record StockTransactionServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static StockTransactionServiceResult<T> Success(T value, int statusCode = 200) =>
        new(value, statusCode, []);

    public static StockTransactionServiceResult<T> Failure(int statusCode, params string[] errors) =>
        new(default, statusCode, errors);
}