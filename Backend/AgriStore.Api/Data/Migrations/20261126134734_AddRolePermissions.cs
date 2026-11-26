using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRolePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Module = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermissionCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => new { x.RoleId, x.PermissionCode });
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionCode",
                        column: x => x.PermissionCode,
                        principalTable: "Permissions",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "Code", "Action", "Description", "Module", "Name" },
                values: new object[,]
                {
                    { "catalog.manage", "manage", "Quản lý danh mục, đơn vị và duyệt đánh giá.", "catalog", "Quản lý danh mục" },
                    { "customers.manage", "manage", "Xem và quản lý khách hàng cùng sổ địa chỉ.", "customers", "Quản lý khách hàng" },
                    { "operations.manage", "manage", "Quản lý đơn hàng, kho, nhà cung cấp, giao hàng và thanh toán.", "operations", "Quản lý vận hành" },
                    { "products.manage", "manage", "Tạo, sửa, xóa sản phẩm và quản lý hình ảnh.", "products", "Quản lý sản phẩm" },
                    { "products.view", "view", "Xem danh sách và chi tiết sản phẩm.", "products", "Xem sản phẩm" },
                    { "reports.view", "view", "Xem báo cáo doanh thu, sản phẩm bán chạy và tồn kho.", "reports", "Xem báo cáo" },
                    { "roles.manage", "manage", "Tạo, sửa, xóa vai trò và gán permission.", "roles", "Quản lý vai trò" },
                    { "users.assign_roles", "assign_roles", "Thay đổi vai trò được gán cho người dùng.", "users", "Gán vai trò" },
                    { "users.manage", "manage", "Cập nhật và khóa/mở tài khoản người dùng.", "users", "Quản lý người dùng" },
                    { "users.read", "read", "Xem danh sách và thông tin người dùng.", "users", "Xem người dùng" }
                });

            migrationBuilder.Sql(
                """
                INSERT INTO "RolePermissions" ("RoleId", "PermissionCode")
                SELECT r."Id", p."Code"
                FROM "Roles" r
                CROSS JOIN "Permissions" p
                WHERE r."Name" = 'Manager'
                    AND p."Code" = ANY (ARRAY[
                        'users.read', 'users.manage', 'products.view', 'products.manage',
                        'catalog.manage', 'operations.manage', 'customers.manage', 'reports.view'
                    ])
                ON CONFLICT DO NOTHING;

                INSERT INTO "RolePermissions" ("RoleId", "PermissionCode")
                SELECT r."Id", p."Code"
                FROM "Roles" r
                CROSS JOIN "Permissions" p
                WHERE r."Name" = 'Staff'
                    AND p."Code" = ANY (ARRAY['operations.manage', 'customers.manage', 'reports.view'])
                ON CONFLICT DO NOTHING;

                INSERT INTO "RolePermissions" ("RoleId", "PermissionCode")
                SELECT r."Id", p."Code"
                FROM "Roles" r
                CROSS JOIN "Permissions" p
                WHERE r."Name" = 'Customer'
                    AND p."Code" = 'products.view'
                ON CONFLICT DO NOTHING;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Module_Action",
                table: "Permissions",
                columns: new[] { "Module", "Action" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionCode",
                table: "RolePermissions",
                column: "PermissionCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "Permissions");
        }
    }
}
