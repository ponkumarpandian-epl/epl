using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaceholderMembers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "TeamMembers",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AcknowledgedAt",
                table: "TeamMembers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "LinkedFromPlaceholder",
                table: "TeamMembers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PlaceholderMobile",
                table: "TeamMembers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaceholderName",
                table: "TeamMembers",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_TeamId_PlaceholderMobile",
                table: "TeamMembers",
                columns: new[] { "TeamId", "PlaceholderMobile" },
                unique: true,
                filter: "[Status] = 1 AND [UserId] IS NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_TeamMembers_Identity",
                table: "TeamMembers",
                sql: "([UserId] IS NOT NULL AND [PlaceholderName] IS NULL AND [PlaceholderMobile] IS NULL) OR ([UserId] IS NULL AND [PlaceholderName] IS NOT NULL AND [PlaceholderMobile] IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TeamMembers_TeamId_PlaceholderMobile",
                table: "TeamMembers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TeamMembers_Identity",
                table: "TeamMembers");

            migrationBuilder.DropColumn(
                name: "AcknowledgedAt",
                table: "TeamMembers");

            migrationBuilder.DropColumn(
                name: "LinkedFromPlaceholder",
                table: "TeamMembers");

            migrationBuilder.DropColumn(
                name: "PlaceholderMobile",
                table: "TeamMembers");

            migrationBuilder.DropColumn(
                name: "PlaceholderName",
                table: "TeamMembers");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "TeamMembers",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
