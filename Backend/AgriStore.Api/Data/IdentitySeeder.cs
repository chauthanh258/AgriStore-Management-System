using AgriStore.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Data;

public static class IdentitySeeder
{
    private const string SamplePassword = "AgriStore123";

    private static readonly IReadOnlyCollection<(string Name, string Description)> Roles =
    [
        ("Admin", "Quản trị viên hệ thống"),
        ("Manager", "Quản lý cửa hàng"),
        ("Staff", "Nhân viên bán hàng hoặc kho"),
        ("Customer", "Khách hàng")
    ];

    public static async Task SeedRolesAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var dbContext = services.GetRequiredService<ApplicationDbContext>();

        foreach (var (name, description) in Roles)
        {
            if (await roleManager.RoleExistsAsync(name))
            {
                continue;
            }

            var result = await roleManager.CreateAsync(new ApplicationRole
            {
                Name = name,
                NormalizedName = name.ToUpperInvariant(),
                Description = description
            });

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(error => error.Description));
                throw new InvalidOperationException($"Không thể tạo role '{name}': {errors}");
            }
        }

        var sampleUsers = new[]
        {
            (Id: new Guid("11000000-0000-0000-0000-000000000001"), UserName: "admin", Email: "admin@agristore.local", FullName: "AgriStore Admin", Role: "Admin"),
            (Id: new Guid("11000000-0000-0000-0000-000000000002"), UserName: "manager", Email: "manager@agristore.local", FullName: "AgriStore Manager", Role: "Manager"),
            (Id: new Guid("11000000-0000-0000-0000-000000000003"), UserName: "staff", Email: "staff@agristore.local", FullName: "AgriStore Staff", Role: "Staff"),
            (Id: new Guid("11000000-0000-0000-0000-000000000004"), UserName: "customer", Email: "customer@agristore.local", FullName: "AgriStore Customer", Role: "Customer")
        };

        foreach (var sampleUser in sampleUsers)
        {
            var user = await userManager.FindByEmailAsync(sampleUser.Email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    Id = sampleUser.Id,
                    UserName = sampleUser.UserName,
                    NormalizedUserName = sampleUser.UserName.ToUpperInvariant(),
                    Email = sampleUser.Email,
                    NormalizedEmail = sampleUser.Email.ToUpperInvariant(),
                    EmailConfirmed = true,
                    FullName = sampleUser.FullName,
                    IsActive = true,
                    SecurityStamp = $"seed-{sampleUser.UserName}",
                    ConcurrencyStamp = $"seed-{sampleUser.UserName}",
                    CreatedAt = DateTime.UtcNow
                };

                var createResult = await userManager.CreateAsync(user, SamplePassword);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(error => error.Description));
                    throw new InvalidOperationException($"Không thể tạo user mẫu '{sampleUser.Email}': {errors}");
                }
            }

            if (!await userManager.IsInRoleAsync(user, sampleUser.Role))
            {
                var roleResult = await userManager.AddToRoleAsync(user, sampleUser.Role);
                if (!roleResult.Succeeded)
                {
                    var errors = string.Join(", ", roleResult.Errors.Select(error => error.Description));
                    throw new InvalidOperationException($"Không thể gán role '{sampleUser.Role}' cho '{sampleUser.Email}': {errors}");
                }
            }
        }

        var customerUser = await userManager.FindByEmailAsync("customer@agristore.local");
        var sampleCustomer = await dbContext.Customers.SingleOrDefaultAsync(customer => customer.Phone == "0900000003");
        if (customerUser is not null && sampleCustomer is not null && sampleCustomer.UserId != customerUser.Id)
        {
            sampleCustomer.UserId = customerUser.Id;
        }

        if (customerUser is not null &&
            !await dbContext.Notifications.AnyAsync(notification => notification.Id == new Guid("f0000000-0000-0000-0000-000000000002")))
        {
            dbContext.Notifications.Add(new Notification
            {
                Id = new Guid("f0000000-0000-0000-0000-000000000002"),
                UserId = customerUser.Id,
                Title = "Chào mừng đến với AgriStore",
                Content = "Cảm ơn bạn đã sử dụng AgriStore.",
                Type = "Welcome",
                CreatedAt = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync();
    }
}
