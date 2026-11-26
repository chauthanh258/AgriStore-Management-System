using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseOrderIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Composite index phục vụ GetPagedAsync:
            //   WHERE Status = ? ORDER BY OrderDate DESC, Id DESC
            // Bao phủ cả trường hợp không filter Status (vẫn dùng được phần OrderDate, Id).
            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_Status_OrderDate_Id",
                table: "PurchaseOrders",
                columns: new[] { "Status", "OrderDate", "Id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_Status_OrderDate_Id",
                table: "PurchaseOrders");
        }
    }
}
