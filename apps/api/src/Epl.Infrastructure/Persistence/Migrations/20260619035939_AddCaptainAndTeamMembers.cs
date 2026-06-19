using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCaptainAndTeamMembers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CaptainUserId",
                table: "Teams",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxRosterSize",
                table: "SeasonGames",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TeamMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsCaptain = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    ShirtNumber = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    Position = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    AddedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RemovedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamMembers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TeamMembers_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Teams_CaptainUserId",
                table: "Teams",
                column: "CaptainUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_TeamId_UserId",
                table: "TeamMembers",
                columns: new[] { "TeamId", "UserId" },
                unique: true,
                filter: "[Status] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_UserId_Status",
                table: "TeamMembers",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_AspNetUsers_CaptainUserId",
                table: "Teams",
                column: "CaptainUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // ── Backfill (plan/10 §2.3) ──────────────────────────────────────
            // 1) Attach a captain account ONLY where CaptainMobile maps to exactly
            //    one AspNetUsers.PhoneNumber. Ambiguous (>1 match) and no-match rows
            //    stay NULL for an admin to resolve later. Idempotent via IS NULL.
            migrationBuilder.Sql(@"
UPDATE t
SET t.CaptainUserId = m.UserId
FROM Teams t
INNER JOIN (
    SELECT a.PhoneNumber, MIN(a.Id) AS UserId
    FROM AspNetUsers a
    WHERE a.PhoneNumber IS NOT NULL AND a.PhoneNumber <> ''
    GROUP BY a.PhoneNumber
    HAVING COUNT(*) = 1
) m ON m.PhoneNumber = t.CaptainMobile
WHERE t.CaptainUserId IS NULL;");

            // 2) Seed a captain roster row for every team that now has a captain
            //    account but no Active membership for them yet. Idempotent via NOT EXISTS.
            migrationBuilder.Sql(@"
INSERT INTO TeamMembers (Id, TeamId, UserId, IsCaptain, Status, AddedByUserId, AddedAt, RemovedAt)
SELECT NEWID(), t.Id, t.CaptainUserId, 1, 1, t.CaptainUserId, t.CreatedAt, NULL
FROM Teams t
WHERE t.CaptainUserId IS NOT NULL
  AND NOT EXISTS (
        SELECT 1 FROM TeamMembers m
        WHERE m.TeamId = t.Id AND m.UserId = t.CaptainUserId AND m.Status = 1);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Teams_AspNetUsers_CaptainUserId",
                table: "Teams");

            migrationBuilder.DropTable(
                name: "TeamMembers");

            migrationBuilder.DropIndex(
                name: "IX_Teams_CaptainUserId",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "CaptainUserId",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "MaxRosterSize",
                table: "SeasonGames");
        }
    }
}
