using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using AgriStore.Api.DTOs.Suppliers;
using AgriStore.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Tests;

public sealed class SupplierServiceTests
{
    [Fact]
    public async Task GetPagedAsync_ReturnsEmptyPage_WhenOffsetExceedsIntRange()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"supplier-test-{Guid.NewGuid():N}")
            .Options;
        await using var dbContext = new ApplicationDbContext(options);
        dbContext.Suppliers.Add(new Supplier
        {
            Id = Guid.NewGuid(),
            Code = "SUP-TEST",
            Name = "Nhà cung cấp kiểm thử",
            IsActive = true
        });
        await dbContext.SaveChangesAsync();

        var service = new SupplierService(dbContext);
        var result = await service.GetPagedAsync(
            new SupplierListQuery(Page: int.MaxValue, PageSize: 100),
            CancellationToken.None);

        Assert.Empty(result.Items);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(int.MaxValue, result.Page);
        Assert.Equal(100, result.PageSize);
    }
}
