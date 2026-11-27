using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeProductCatalogQueries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_CategoryId",
                table: "Products");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Category_IsActive_CreatedAt_Code",
                table: "Products",
                columns: new[] { "CategoryId", "IsActive", "CreatedAt", "Code" },
                descending: new[] { false, false, true, false });

            migrationBuilder.CreateIndex(
                name: "IX_Products_Code_Name_Trgm",
                table: "Products",
                columns: new[] { "Code", "Name" })
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops", "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_IsActive_CreatedAt_Code",
                table: "Products",
                columns: new[] { "IsActive", "CreatedAt", "Code" },
                descending: new[] { false, true, false });

            migrationBuilder.CreateIndex(
                name: "IX_Products_IsActive_SellingPrice_Code",
                table: "Products",
                columns: new[] { "IsActive", "SellingPrice", "Code" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_Name_Code",
                table: "Products",
                columns: new[] { "Name", "Code" });

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_Category_IsActive_CreatedAt_Code",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_Code_Name_Trgm",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_IsActive_CreatedAt_Code",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_IsActive_SellingPrice_Code",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_Name_Code",
                table: "Products");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");
        }
    }
}
