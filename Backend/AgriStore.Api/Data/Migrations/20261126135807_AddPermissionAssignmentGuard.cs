using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPermissionAssignmentGuard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "Code", "Action", "Description", "Module", "Name" },
                values: new object[] { "roles.assign_permissions", "assign_permissions", "Thay đổi permission được gán cho role.", "roles", "Gán permission cho vai trò" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "Code",
                keyValue: "roles.assign_permissions");
        }
    }
}
