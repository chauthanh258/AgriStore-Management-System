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

namespace AgriStore.Api.Tests;

public sealed class ApiTestFactory : WebApplicationFactory<Program>
{
    public static readonly Guid TestAdminUserId = Guid.Parse("9f3562ee-8f06-4c12-9872-ef7afbe2a0a4");
    private readonly string _databaseName = $"agristore-test-{Guid.NewGuid():N}";
    private readonly string _webRootPath = Path.Combine(Path.GetTempPath(), $"agristore-test-{Guid.NewGuid():N}");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        Directory.CreateDirectory(_webRootPath);
        builder.UseWebRoot(_webRootPath);
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

    public new HttpClient CreateClient()
    {
        var client = base.CreateClient();
        SeedTestAdminAsync().GetAwaiter().GetResult();
        AddTestIdentityHeaders(client, TestAdminUserId, "Admin");
        return client;
    }

    public HttpClient CreateClientAs(Guid userId, params string[] roles)
    {
        var client = base.CreateClient();
        AddTestIdentityHeaders(client, userId, roles);
        return client;
    }

    public string TestWebRootPath => _webRootPath;

    public async Task<CatalogSeed> SeedCatalogAsync()
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = $"Test category {Guid.NewGuid():N}"
        };
        var unit = new Unit
        {
            Id = Guid.NewGuid(),
            Name = $"Test unit {Guid.NewGuid():N}",
            Symbol = "ea"
        };
        dbContext.Categories.Add(category);
        dbContext.Units.Add(unit);
        await dbContext.SaveChangesAsync();
        return new CatalogSeed(category.Id, unit.Id);
    }

    public async Task<Guid> SeedProductAsync(
        CatalogSeed catalog,
        string code,
        string name,
        decimal sellingPrice = 10m,
        bool isActive = true)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = name,
            CategoryId = catalog.CategoryId,
            UnitId = catalog.UnitId,
            CostPrice = 5m,
            SellingPrice = sellingPrice,
            MinStockAlert = 1m,
            IsActive = isActive
        };
        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync();
        return product.Id;
    }

    public async Task SeedCompletedPurchaseAsync(Guid userId, Guid productId)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FullName = "Test Customer",
            Phone = Guid.NewGuid().ToString("N")
        };
        var order = new Order
        {
            Id = Guid.NewGuid(),
            Code = $"TEST-{Guid.NewGuid():N}",
            CustomerId = customer.Id,
            Status = "Completed",
            OrderDate = DateTime.UtcNow
        };
        dbContext.Customers.Add(customer);
        dbContext.Orders.Add(order);
        dbContext.OrderDetails.Add(new OrderDetail
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            ProductId = productId,
            Quantity = 1m,
            UnitPrice = 10m,
            TotalPrice = 10m
        });
        await dbContext.SaveChangesAsync();
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

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(_webRootPath))
        {
            Directory.Delete(_webRootPath, recursive: true);
        }
    }

    private async Task SeedTestAdminAsync()
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var role = await dbContext.Roles.SingleOrDefaultAsync(item => item.NormalizedName == "ADMIN");
        if (role is null)
        {
            role = new ApplicationRole
            {
                Id = Guid.NewGuid(),
                Name = "Admin",
                NormalizedName = "ADMIN"
            };
            dbContext.Roles.Add(role);
        }

        if (!await dbContext.Users.AnyAsync(user => user.Id == TestAdminUserId))
        {
            dbContext.Users.Add(new ApplicationUser
            {
                Id = TestAdminUserId,
                UserName = "api-test-admin",
                NormalizedUserName = "API-TEST-ADMIN",
                Email = "api-test-admin@example.test",
                NormalizedEmail = "API-TEST-ADMIN@EXAMPLE.TEST",
                FullName = "API Test Admin"
            });
        }

        if (!await dbContext.UserRoles.AnyAsync(
                item => item.UserId == TestAdminUserId && item.RoleId == role.Id))
        {
            dbContext.UserRoles.Add(new ApplicationUserRole
            {
                UserId = TestAdminUserId,
                RoleId = role.Id
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private static void AddTestIdentityHeaders(HttpClient client, Guid userId, params string[] roles)
    {
        client.DefaultRequestHeaders.Add("X-Test-User-Id", userId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Roles", string.Join(",", roles));
    }
}

public sealed record SaleSeed(Guid WarehouseId, Guid ProductId);
public sealed record CatalogSeed(Guid CategoryId, Guid UnitId);

internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiTests";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Guid.TryParse(Context.Request.Headers["X-Test-User-Id"], out var userId))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var roles = Context.Request.Headers["X-Test-Roles"]
            .ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, "api-test")
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
