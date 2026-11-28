using System.Security.Claims;
using System.Text.Encodings.Web;
using AgriStore.Api.Data;
using AgriStore.Api.Domain.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace AgriStore.Api.Tests;

public sealed class ApiTestFactory : WebApplicationFactory<Program>
{
    private const string TestJwtKey = "test-key-that-is-at-least-thirty-two-characters";
    private const string TestJwtIssuer = "AgriStore.Tests";
    private const string TestJwtAudience = "AgriStore.Tests";
    private readonly string _databaseName = $"agristore-test-{Guid.NewGuid():N}";

    public ApiTestFactory(bool useTestAuthentication = true)
    {
        UseTestAuthentication = useTestAuthentication;
    }

    private bool UseTestAuthentication { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=agristore-tests",
                ["Jwt:Key"] = TestJwtKey,
                ["Jwt:Issuer"] = TestJwtIssuer,
                ["Jwt:Audience"] = TestJwtAudience
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

            if (UseTestAuthentication)
            {
                services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                        options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                        options.DefaultScheme = TestAuthHandler.SchemeName;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        TestAuthHandler.SchemeName,
                        _ => { });
            }
            else
            {
                services.PostConfigure<JwtBearerOptions>(
                    JwtBearerDefaults.AuthenticationScheme,
                    options =>
                    {
                        options.TokenValidationParameters.IssuerSigningKey =
                            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtKey));
                        options.TokenValidationParameters.ValidIssuer = TestJwtIssuer;
                        options.TokenValidationParameters.ValidAudience = TestJwtAudience;
                    });
            }
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
}

public sealed record SaleSeed(Guid WarehouseId, Guid ProductId);

internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiTests";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var role = Request.Headers.TryGetValue("X-Test-Role", out var requestedRole)
            ? requestedRole.ToString()
            : "Staff";
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, "api-test"),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
