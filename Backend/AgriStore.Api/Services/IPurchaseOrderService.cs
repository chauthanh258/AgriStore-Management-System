using AgriStore.Api.DTOs.PurchaseOrders;

namespace AgriStore.Api.Services;

public interface IPurchaseOrderService
{
    Task<PurchaseOrderResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> CreateAsync(
        PurchaseOrderRequest request,
        CancellationToken cancellationToken);
    Task<PurchaseOrderServiceResult<PurchaseOrderResponse>> UpdateAsync(
        Guid id,
        PurchaseOrderRequest request,
        CancellationToken cancellationToken);
}

public sealed record PurchaseOrderServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static PurchaseOrderServiceResult<T> Success(T value, int statusCode = 200) => new(value, statusCode, []);
    public static PurchaseOrderServiceResult<T> Failure(int statusCode, params string[] errors) => new(default, statusCode, errors);
}