using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class EnsureSingleMainProductImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                WITH ranked_main_images AS (
                    SELECT "Id", ROW_NUMBER() OVER (
                        PARTITION BY "ProductId"
                        ORDER BY "SortOrder", "Id") AS row_number
                    FROM "ProductImages"
                    WHERE "IsMain" = TRUE
                )
                UPDATE "ProductImages" AS image
                SET "IsMain" = FALSE
                FROM ranked_main_images AS ranked
                WHERE image."Id" = ranked."Id" AND ranked.row_number > 1;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ProductId_Main",
                table: "ProductImages",
                column: "ProductId",
                unique: true,
                filter: "\"IsMain\" = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProductImages_ProductId_Main",
                table: "ProductImages");
        }
    }
}
