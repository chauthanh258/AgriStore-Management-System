using AgriStore.Api.DTOs.Categories;

namespace AgriStore.Api.Services;

public interface ICategoryService
{
    Task<CategoryListResponse> GetPagedAsync(CategoryListQuery query, CancellationToken cancellationToken);
    Task<CategoryResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<CategoryServiceResult<CategoryResponse>> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryServiceResult<CategoryResponse>> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryServiceResult<CategoryResponse>> SetActiveAsync(Guid id, bool isActive, CancellationToken cancellationToken);
    Task<CategoryServiceResult<CategoryResponse>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed record CategoryServiceResult<T>(
    T? Value,
    int StatusCode,
    IReadOnlyCollection<string> Errors)
{
    public bool Succeeded => StatusCode is >= 200 and < 300;

    public static CategoryServiceResult<T> Success(T value) => new(value, 200, []);
    public static CategoryServiceResult<T> Failure(int statusCode, params string[] errors) => new(default, statusCode, errors);
}
