using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStockTransactionMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BatchId",
                table: "StockTransactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CountedQuantity",
                table: "StockTransactions",
                type: "numeric(18,3)",
                precision: 18,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityAfter",
                table: "StockTransactions",
                type: "numeric(18,3)",
                precision: 18,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityBefore",
                table: "StockTransactions",
                type: "numeric(18,3)",
                precision: 18,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferenceType",
                table: "StockTransactions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.Sql("UPDATE \"StockTransactions\" SET \"BatchId\" = \"Id\" WHERE \"BatchId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransactions_BatchId_CreatedAt",
                table: "StockTransactions",
                columns: new[] { "BatchId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StockTransactions_ReferenceType_ReferenceId",
                table: "StockTransactions",
                columns: new[] { "ReferenceType", "ReferenceId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StockTransactions_BatchId_CreatedAt",
                table: "StockTransactions");

            migrationBuilder.DropIndex(
                name: "IX_StockTransactions_ReferenceType_ReferenceId",
                table: "StockTransactions");

            migrationBuilder.DropColumn(
                name: "BatchId",
                table: "StockTransactions");

            migrationBuilder.DropColumn(
                name: "CountedQuantity",
                table: "StockTransactions");

            migrationBuilder.DropColumn(
                name: "QuantityAfter",
                table: "StockTransactions");

            migrationBuilder.DropColumn(
                name: "QuantityBefore",
                table: "StockTransactions");

            migrationBuilder.DropColumn(
                name: "ReferenceType",
                table: "StockTransactions");
        }
    }
}
