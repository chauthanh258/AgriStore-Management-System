using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriStore.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProductValidationConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE duplicate_codes text;
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM "Products"
                        WHERE length(btrim("Name")) = 0
                    ) THEN
                        RAISE EXCEPTION 'Product names contain blank values; correct them before applying this migration.';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM "Products"
                        WHERE "CostPrice" < 0
                            OR "SellingPrice" <= 0
                            OR "MinStockAlert" < 0
                            OR "ExpiryDays" <= 0
                    ) THEN
                        RAISE EXCEPTION 'Product price, stock threshold, or expiry data violates the new constraints; correct it before applying this migration.';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM "Products"
                        WHERE btrim("Code") !~ '^[A-Za-z0-9]+([._-][A-Za-z0-9]+)*$'
                    ) THEN
                        RAISE EXCEPTION 'Product codes contain values that do not match the allowed SKU format; correct them before applying this migration.';
                    END IF;

                    SELECT string_agg(format('%s (%s records)', normalized_code, record_count), ', ')
                    INTO duplicate_codes
                    FROM (
                        SELECT upper(btrim("Code")) AS normalized_code, count(*) AS record_count
                        FROM "Products"
                        GROUP BY upper(btrim("Code"))
                        HAVING count(*) > 1
                        ORDER BY upper(btrim("Code"))
                        LIMIT 20
                    ) duplicates;

                    IF duplicate_codes IS NOT NULL THEN
                        RAISE EXCEPTION 'Product codes collide after case and whitespace normalization: %', duplicate_codes;
                    END IF;

                    UPDATE "Products"
                    SET "Code" = upper(btrim("Code")),
                        "Name" = btrim("Name")
                    WHERE "Code" IS DISTINCT FROM upper(btrim("Code"))
                        OR "Name" IS DISTINCT FROM btrim("Name");
                END $$;
                """);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_Code_Canonical",
                table: "Products",
                sql: "\"Code\" = upper(btrim(\"Code\")) AND \"Code\" ~ '^[A-Z0-9]+([._-][A-Z0-9]+)*$'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_CostPrice_NonNegative",
                table: "Products",
                sql: "\"CostPrice\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_ExpiryDays_Positive",
                table: "Products",
                sql: "\"ExpiryDays\" IS NULL OR \"ExpiryDays\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_MinStockAlert_NonNegative",
                table: "Products",
                sql: "\"MinStockAlert\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_Name_Required",
                table: "Products",
                sql: "\"Name\" = btrim(\"Name\") AND length(btrim(\"Name\")) > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_SellingPrice_Positive",
                table: "Products",
                sql: "\"SellingPrice\" > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_Code_Canonical",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_CostPrice_NonNegative",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_ExpiryDays_Positive",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_MinStockAlert_NonNegative",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_Name_Required",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_SellingPrice_Positive",
                table: "Products");
        }
    }
}
