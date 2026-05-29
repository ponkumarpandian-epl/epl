using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentsAndCaptain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CaptainUserId",
                table: "Teams",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TeamMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsCaptain = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ShirtNumber = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: true),
                    Position = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
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

            migrationBuilder.CreateTable(
                name: "Tournaments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GameId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Tagline = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1200)", maxLength: 1200, nullable: true),
                    Venue = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    StartsOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    EndsOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RegistrationDeadline = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    BannerImageUrl = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    WhatsAppGroupUrl = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    EntryFeeRupees = table.Column<int>(type: "int", nullable: false),
                    RegistrationOpen = table.Column<bool>(type: "bit", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Contacts = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tournaments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tournaments_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TournamentCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TournamentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Format = table.Column<int>(type: "int", nullable: false),
                    PlayersPerEntry = table.Column<int>(type: "int", nullable: false),
                    MinEntries = table.Column<int>(type: "int", nullable: false),
                    MaxEntries = table.Column<int>(type: "int", nullable: false),
                    EntryFeeRupees = table.Column<int>(type: "int", nullable: false),
                    RegistrationOpen = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TournamentCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TournamentCategories_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
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

            migrationBuilder.CreateIndex(
                name: "IX_TournamentCategories_TournamentId_Format",
                table: "TournamentCategories",
                columns: new[] { "TournamentId", "Format" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tournaments_GameId",
                table: "Tournaments",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_Tournaments_Slug",
                table: "Tournaments",
                column: "Slug",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_AspNetUsers_CaptainUserId",
                table: "Teams",
                column: "CaptainUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // ── Captain backfill (plan 10 §2.3) ────────────────────────────────
            // Match each Team.CaptainMobile (E.164) to AspNetUsers.PhoneNumber and:
            //   1) populate Team.CaptainUserId where a unique match exists
            //   2) create a Captain TeamMember row for that user
            // Idempotent: only touches rows where CaptainUserId IS NULL, and only
            // creates a TeamMember row if one doesn't already exist for that pair.
            migrationBuilder.Sql(@"
                UPDATE T
                   SET T.CaptainUserId = U.Id
                  FROM Teams T
                  JOIN AspNetUsers U ON U.PhoneNumber = T.CaptainMobile
                 WHERE T.CaptainUserId IS NULL
                   AND U.PhoneNumber IS NOT NULL
                   AND NOT EXISTS (
                         SELECT 1 FROM AspNetUsers U2
                          WHERE U2.PhoneNumber = T.CaptainMobile
                            AND U2.Id <> U.Id
                       );
            ");

            migrationBuilder.Sql(@"
                INSERT INTO TeamMembers (Id, TeamId, UserId, IsCaptain, Status,
                                         ShirtNumber, Position, AddedByUserId,
                                         AddedAt, RemovedAt)
                SELECT NEWID(), T.Id, T.CaptainUserId, 1, 1,
                       NULL, NULL, T.CaptainUserId,
                       T.CreatedAt, NULL
                  FROM Teams T
                 WHERE T.CaptainUserId IS NOT NULL
                   AND NOT EXISTS (
                         SELECT 1 FROM TeamMembers M
                          WHERE M.TeamId = T.Id
                            AND M.UserId = T.CaptainUserId
                            AND M.Status = 1
                       );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Teams_AspNetUsers_CaptainUserId",
                table: "Teams");

            migrationBuilder.DropTable(
                name: "TeamMembers");

            migrationBuilder.DropTable(
                name: "TournamentCategories");

            migrationBuilder.DropTable(
                name: "Tournaments");

            migrationBuilder.DropIndex(
                name: "IX_Teams_CaptainUserId",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "CaptainUserId",
                table: "Teams");
        }
    }
}
