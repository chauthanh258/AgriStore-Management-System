using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeOrderAndReportIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Payments_Status_PaidAt",
                table: "Payments",
                columns: new[] { "Status", "PaidAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderDate_Id",
                table: "Orders",
                columns: new[] { "OrderDate", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Status_OrderDate_Id",
                table: "Orders",
                columns: new[] { "Status", "OrderDate", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Payments_Status_PaidAt",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Orders_OrderDate_Id",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_Status_OrderDate_Id",
                table: "Orders");
        }
    }
}
