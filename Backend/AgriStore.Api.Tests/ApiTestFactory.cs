using System.Security.Claims;
using System.Text.Encodings.Web;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using AgriStore.Api.DTOs.Suppliers;
using AgriStore.Api.DTOs.PurchaseOrders;

namespace AgriStore.Api.Tests;

public sealed class ApiTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"agristore-test-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=agristore-tests",
                ["Jwt:Key"] = "test-key-that-is-at-least-thirty-two-characters",
                ["Jwt:Issuer"] = "AgriStore.Tests",
                ["Jwt:Audience"] = "AgriStore.Tests"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<ApplicationDbContext>();
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options =>
                options
                    .UseInMemoryDatabase(_databaseName)
                    .ConfigureWarnings(warnings =>
                        warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName,
                    _ => { });
        });
    }

    public async Task<SaleSeed> SeedSaleAsync(decimal quantity)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = $"Test warehouse {Guid.NewGuid():N}",
            IsDefault = true,
            IsActive = true
        };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = $"TEST-{Guid.NewGuid():N}"[..13].ToUpperInvariant(),
            Name = "Test product",
            CategoryId = Guid.NewGuid(),
            UnitId = Guid.NewGuid(),
            SellingPrice = 100m,
            CostPrice = 50m,
            IsActive = true
        };

        dbContext.Warehouses.Add(warehouse);
        dbContext.Products.Add(product);
        dbContext.Inventories.Add(new Inventory
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Quantity = quantity
        });
        await dbContext.SaveChangesAsync();

        return new SaleSeed(warehouse.Id, product.Id);
    }

    public async Task<decimal> GetInventoryQuantityAsync(SaleSeed seed)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.Inventories
            .Where(item => item.ProductId == seed.ProductId && item.WarehouseId == seed.WarehouseId)
            .Select(item => item.Quantity)
            .SingleAsync();
    }

    /// <summary>
    /// Lấy số lượng tồn kho hiện tại của một sản phẩm trong một kho cụ thể.
    /// Trả về 0 nếu chưa có bản ghi Inventory (chưa nhận hàng lần nào).
    /// </summary>
    public async Task<decimal> GetInventoryQuantityAsync(Guid productId, Guid warehouseId)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.Inventories
            .Where(item => item.ProductId == productId && item.WarehouseId == warehouseId)
            .Select(item => item.Quantity)
            .SingleOrDefaultAsync();
    }

    /// <summary>
    /// Lấy số lượng bản ghi StockTransaction loại Import cho sản phẩm trong kho,
    /// dùng để xác nhận ReceiveAsync đã tạo đúng giao dịch nhập kho.
    /// </summary>
    public async Task<int> CountImportTransactionsAsync(Guid productId, Guid warehouseId)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.StockTransactions
            .Where(t => t.ProductId == productId
                     && t.WarehouseId == warehouseId
                     && t.TransactionType == "Import")
            .CountAsync();
    }
}

public sealed record SaleSeed(Guid WarehouseId, Guid ProductId);

internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiTests";

    // UserId cố định khớp với user "staff" được seed bởi IdentitySeeder (Id = 11000000-...-0003).
    // Role Staff có permission "operations.manage" nên có thể gọi ManageOperations endpoints.
    public const string StaffUserId = "11000000-0000-0000-0000-000000000003";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, StaffUserId),
            new Claim(ClaimTypes.Name, "staff"),
            new Claim(ClaimTypes.Role, "Staff")
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
