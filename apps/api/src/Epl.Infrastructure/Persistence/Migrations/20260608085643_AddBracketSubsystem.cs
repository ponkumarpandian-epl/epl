using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBracketSubsystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Brackets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ParentType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Format = table.Column<int>(type: "int", nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DefaultBestOf = table.Column<int>(type: "int", nullable: false),
                    DefaultPointsToWin = table.Column<int>(type: "int", nullable: false),
                    DefaultWinByMargin = table.Column<int>(type: "int", nullable: false),
                    DefaultPointCap = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Brackets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BracketParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BracketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Seed = table.Column<int>(type: "int", nullable: true),
                    SourceEntryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SourceTeamId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsBye = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BracketParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BracketParticipants_Brackets_BracketId",
                        column: x => x.BracketId,
                        principalTable: "Brackets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BracketRounds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BracketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    GroupLabel = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    BestOf = table.Column<int>(type: "int", nullable: true),
                    PointsToWin = table.Column<int>(type: "int", nullable: true),
                    WinByMargin = table.Column<int>(type: "int", nullable: true),
                    PointCap = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BracketRounds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BracketRounds_Brackets_BracketId",
                        column: x => x.BracketId,
                        principalTable: "Brackets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Matches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BracketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoundId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SlotIndex = table.Column<int>(type: "int", nullable: false),
                    ParticipantAId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ParticipantBId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    WinnerParticipantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ScheduledAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Court = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    NextMatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RulesBestOf = table.Column<int>(type: "int", nullable: false),
                    RulesPointsToWin = table.Column<int>(type: "int", nullable: false),
                    RulesWinByMargin = table.Column<int>(type: "int", nullable: false),
                    RulesPointCap = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Matches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Matches_BracketRounds_RoundId",
                        column: x => x.RoundId,
                        principalTable: "BracketRounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Matches_Brackets_BracketId",
                        column: x => x.BracketId,
                        principalTable: "Brackets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BracketParticipants_BracketId",
                table: "BracketParticipants",
                column: "BracketId");

            migrationBuilder.CreateIndex(
                name: "IX_BracketParticipants_SourceEntryId",
                table: "BracketParticipants",
                column: "SourceEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_BracketRounds_BracketId_OrderIndex",
                table: "BracketRounds",
                columns: new[] { "BracketId", "OrderIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Brackets_ParentType_ParentId",
                table: "Brackets",
                columns: new[] { "ParentType", "ParentId" });

            migrationBuilder.CreateIndex(
                name: "IX_Matches_BracketId_RoundId_SlotIndex",
                table: "Matches",
                columns: new[] { "BracketId", "RoundId", "SlotIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Matches_NextMatchId",
                table: "Matches",
                column: "NextMatchId");

            migrationBuilder.CreateIndex(
                name: "IX_Matches_RoundId",
                table: "Matches",
                column: "RoundId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BracketParticipants");

            migrationBuilder.DropTable(
                name: "Matches");

            migrationBuilder.DropTable(
                name: "BracketRounds");

            migrationBuilder.DropTable(
                name: "Brackets");
        }
    }
}
