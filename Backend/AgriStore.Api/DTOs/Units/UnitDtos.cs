using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Units;

public sealed record UnitResponse(
    Guid Id,
    string Name,
    string Symbol,
    string? Description);

public sealed record UnitListQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null);

public sealed record UnitListResponse(
    IReadOnlyCollection<UnitResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record CreateUnitRequest
{
    [Required, MaxLength(100)]
    public required string Name { get; init; }

    [Required, MaxLength(20)]
    public required string Symbol { get; init; }

    [MaxLength(500)]
    public string? Description { get; init; }
}

public sealed record UpdateUnitRequest
{
    [Required, MaxLength(100)]
    public required string Name { get; init; }

    [Required, MaxLength(20)]
    public required string Symbol { get; init; }

    [MaxLength(500)]
    public string? Description { get; init; }
}