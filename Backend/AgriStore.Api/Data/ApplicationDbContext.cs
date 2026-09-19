using AgriStore.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AgriStore.Api.Data;

public class ApplicationDbContext : IdentityDbContext<
    ApplicationUser,
    ApplicationRole,
    Guid,
    IdentityUserClaim<Guid>,
    ApplicationUserRole,
    IdentityUserLogin<Guid>,
    IdentityRoleClaim<Guid>,
    IdentityUserToken<Guid>>
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<StockTransaction> StockTransactions => Set<StockTransaction>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderDetail> PurchaseOrderDetails => Set<PurchaseOrderDetail>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderDetail> OrderDetails => Set<OrderDetail>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ShippingMethod> ShippingMethods => Set<ShippingMethod>();
    public DbSet<Delivery> Deliveries => Set<Delivery>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<ProductReview> ProductReviews => Set<ProductReview>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("Users");
            entity.Property(user => user.FullName).HasMaxLength(200).IsRequired();
            entity.Property(user => user.Avatar).HasMaxLength(500);
            entity.Property(user => user.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(user => user.Email).IsUnique();
        });

        builder.Entity<ApplicationRole>(entity =>
        {
            entity.ToTable("Roles");
            entity.Property(role => role.Description).HasMaxLength(500);
            entity.Property(role => role.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        builder.Entity<ApplicationUserRole>(entity =>
        {
            entity.ToTable("UserRoles");
            entity.HasKey(userRole => new { userRole.UserId, userRole.RoleId });
        });

        builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");

        ConfigureCommerceModel(builder);
    }

    private static void ConfigureCommerceModel(ModelBuilder builder)
    {
        builder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(1000);
            entity.Property(item => item.Image).HasMaxLength(500);
            entity.HasIndex(item => item.Name).IsUnique();
            entity.HasOne<Category>().WithMany().HasForeignKey(item => item.ParentId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Unit>(entity =>
        {
            entity.ToTable("Units");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(100).IsRequired();
            entity.Property(item => item.Symbol).HasMaxLength(20).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(500);
            entity.HasIndex(item => item.Name).IsUnique();
        });

        builder.Entity<Product>(entity =>
        {
            entity.ToTable("Products");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Code).HasMaxLength(50).IsRequired();
            entity.Property(item => item.Name).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(2000);
            entity.Property(item => item.ShortDescription).HasMaxLength(500);
            entity.Property(item => item.CostPrice).HasPrecision(18, 2);
            entity.Property(item => item.SellingPrice).HasPrecision(18, 2);
            entity.Property(item => item.MinStockAlert).HasPrecision(18, 3);
            entity.HasIndex(item => item.Code).IsUnique();
            entity.HasOne<Category>().WithMany().HasForeignKey(item => item.CategoryId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Unit>().WithMany().HasForeignKey(item => item.UnitId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ProductImage>(entity =>
        {
            entity.ToTable("ProductImages");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.ImageUrl).HasMaxLength(1000).IsRequired();
            entity.HasIndex(item => new { item.ProductId, item.SortOrder });
            entity.HasOne<Product>().WithMany().HasForeignKey(item => item.ProductId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Supplier>(entity =>
        {
            entity.ToTable("Suppliers");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Code).HasMaxLength(50).IsRequired();
            entity.Property(item => item.Name).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Email).HasMaxLength(256);
            entity.Property(item => item.TaxCode).HasMaxLength(50);
            entity.HasIndex(item => item.Code).IsUnique();
        });

        builder.Entity<Warehouse>(entity =>
        {
            entity.ToTable("Warehouses");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(200).IsRequired();
            entity.HasIndex(item => item.Name).IsUnique();
        });

        builder.Entity<Inventory>(entity =>
        {
            entity.ToTable("Inventories");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Quantity).HasPrecision(18, 3);
            entity.Property(item => item.ReservedQuantity).HasPrecision(18, 3);
            entity.HasIndex(item => new { item.ProductId, item.WarehouseId }).IsUnique();
            entity.HasOne<Product>().WithMany().HasForeignKey(item => item.ProductId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Warehouse>().WithMany().HasForeignKey(item => item.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<StockTransaction>(entity =>
        {
            entity.ToTable("StockTransactions");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.TransactionType).HasMaxLength(30).IsRequired();
            entity.Property(item => item.Quantity).HasPrecision(18, 3);
            entity.HasIndex(item => new { item.ProductId, item.WarehouseId, item.CreatedAt });
            entity.HasOne<Product>().WithMany().HasForeignKey(item => item.ProductId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Warehouse>().WithMany().HasForeignKey(item => item.WarehouseId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.CreatedBy).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<PurchaseOrder>(entity =>
        {
            entity.ToTable("PurchaseOrders");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Code).HasMaxLength(50).IsRequired();
            entity.Property(item => item.Status).HasMaxLength(30).IsRequired();
            entity.Property(item => item.TotalAmount).HasPrecision(18, 2);
            entity.HasIndex(item => item.Code).IsUnique();
            entity.HasOne<Supplier>().WithMany().HasForeignKey(item => item.SupplierId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Warehouse>().WithMany().HasForeignKey(item => item.WarehouseId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.CreatedBy).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<PurchaseOrderDetail>(entity =>
        {
            entity.ToTable("PurchaseOrderDetails");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Quantity).HasPrecision(18, 3);
            entity.Property(item => item.UnitPrice).HasPrecision(18, 2);
            entity.Property(item => item.TotalPrice).HasPrecision(18, 2);
            entity.Property(item => item.ReceivedQuantity).HasPrecision(18, 3);
            entity.HasOne<PurchaseOrder>().WithMany().HasForeignKey(item => item.PurchaseOrderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Product>().WithMany().HasForeignKey(item => item.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Customer>(entity =>
        {
            entity.ToTable("Customers");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.FullName).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Phone).HasMaxLength(30).IsRequired();
            entity.Property(item => item.Email).HasMaxLength(256);
            entity.HasIndex(item => item.Phone).IsUnique();
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Address>(entity =>
        {
            entity.ToTable("Addresses");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.ReceiverName).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Phone).HasMaxLength(30).IsRequired();
            entity.Property(item => item.Province).HasMaxLength(100).IsRequired();
            entity.Property(item => item.District).HasMaxLength(100).IsRequired();
            entity.Property(item => item.Ward).HasMaxLength(100).IsRequired();
            entity.Property(item => item.DetailAddress).HasMaxLength(500).IsRequired();
            entity.HasOne<Customer>().WithMany().HasForeignKey(item => item.CustomerId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Code).HasMaxLength(50).IsRequired();
            entity.Property(item => item.Status).HasMaxLength(30).IsRequired();
            entity.Property(item => item.SubTotal).HasPrecision(18, 2);
            entity.Property(item => item.DiscountAmount).HasPrecision(18, 2);
            entity.Property(item => item.ShippingFee).HasPrecision(18, 2);
            entity.Property(item => item.TotalAmount).HasPrecision(18, 2);
            entity.HasIndex(item => item.Code).IsUnique();
            entity.HasOne<Customer>().WithMany().HasForeignKey(item => item.CustomerId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<Address>().WithMany().HasForeignKey(item => item.ShippingAddressId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<ShippingMethod>().WithMany().HasForeignKey(item => item.ShippingMethodId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<Coupon>().WithMany().HasForeignKey(item => item.CouponId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<OrderDetail>(entity =>
        {
            entity.ToTable("OrderDetails");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Quantity).HasPrecision(18, 3);
            entity.Property(item => item.UnitPrice).HasPrecision(18, 2);
            entity.Property(item => item.Discount).HasPrecision(18, 2);
            entity.Property(item => item.TotalPrice).HasPrecision(18, 2);
            entity.HasOne<Order>().WithMany().HasForeignKey(item => item.OrderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Product>().WithMany().HasForeignKey(item => item.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payments");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.PaymentMethod).HasMaxLength(30).IsRequired();
            entity.Property(item => item.Amount).HasPrecision(18, 2);
            entity.Property(item => item.Status).HasMaxLength(30).IsRequired();
            entity.Property(item => item.TransactionCode).HasMaxLength(100);
            entity.HasIndex(item => item.OrderId).IsUnique();
            entity.HasOne<Order>().WithMany().HasForeignKey(item => item.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ShippingMethod>(entity =>
        {
            entity.ToTable("ShippingMethods");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(100).IsRequired();
            entity.Property(item => item.Fee).HasPrecision(18, 2);
            entity.HasIndex(item => item.Name).IsUnique();
        });

        builder.Entity<Delivery>(entity =>
        {
            entity.ToTable("Deliveries");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.TrackingCode).HasMaxLength(100);
            entity.Property(item => item.Status).HasMaxLength(30).IsRequired();
            entity.HasIndex(item => item.OrderId).IsUnique();
            entity.HasOne<Order>().WithMany().HasForeignKey(item => item.OrderId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Coupon>(entity =>
        {
            entity.ToTable("Coupons");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Code).HasMaxLength(50).IsRequired();
            entity.Property(item => item.DiscountType).HasMaxLength(20).IsRequired();
            entity.Property(item => item.DiscountValue).HasPrecision(18, 2);
            entity.Property(item => item.MinOrderAmount).HasPrecision(18, 2);
            entity.Property(item => item.MaxDiscount).HasPrecision(18, 2);
            entity.HasIndex(item => item.Code).IsUnique();
        });

        builder.Entity<ProductReview>(entity =>
        {
            entity.ToTable("ProductReviews", table => table.HasCheckConstraint("CK_ProductReviews_Rating", "\"Rating\" BETWEEN 1 AND 5"));
            entity.HasKey(item => item.Id);
            entity.HasOne<Product>().WithMany().HasForeignKey(item => item.ProductId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Customer>().WithMany().HasForeignKey(item => item.CustomerId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(item => new { item.ProductId, item.CustomerId }).IsUnique();
        });

        builder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Title).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Type).HasMaxLength(50).IsRequired();
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Action).HasMaxLength(100).IsRequired();
            entity.Property(item => item.TableName).HasMaxLength(100).IsRequired();
            entity.Property(item => item.IpAddress).HasMaxLength(45);
            entity.HasIndex(item => new { item.TableName, item.RecordId, item.CreatedAt });
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
