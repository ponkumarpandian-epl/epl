using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTeamPaymentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PaidAt",
                table: "Teams",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaidTo",
                table: "Teams",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PaymentCompleted",
                table: "Teams",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "PaidTo",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "PaymentCompleted",
                table: "Teams");
        }
    }
}
