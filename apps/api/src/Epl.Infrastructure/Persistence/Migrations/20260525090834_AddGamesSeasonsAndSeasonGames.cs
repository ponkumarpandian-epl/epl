using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGamesSeasonsAndSeasonGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SeasonGameId",
                table: "Teams",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Games",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(800)", maxLength: 800, nullable: true),
                    WhatsAppGroupUrl = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Games", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Seasons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Tagline = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    StartsOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    EndsOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RegistrationOpen = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Seasons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SeasonGames",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SeasonId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GameId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartsOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    EndsOn = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Venue = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Categories = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    EntryFeeRupees = table.Column<int>(type: "int", nullable: false),
                    WhatsAppGroupUrl = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    CardImageUrl = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    RegistrationOpen = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Contacts = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeasonGames", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeasonGames_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SeasonGames_Seasons_SeasonId",
                        column: x => x.SeasonId,
                        principalTable: "Seasons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Teams_SeasonGameId",
                table: "Teams",
                column: "SeasonGameId");

            migrationBuilder.CreateIndex(
                name: "IX_Games_Kind",
                table: "Games",
                column: "Kind",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Games_Slug",
                table: "Games",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SeasonGames_GameId",
                table: "SeasonGames",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_SeasonGames_SeasonId_GameId",
                table: "SeasonGames",
                columns: new[] { "SeasonId", "GameId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Seasons_IsActive",
                table: "Seasons",
                column: "IsActive",
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Seasons_Slug",
                table: "Seasons",
                column: "Slug",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_SeasonGames_SeasonGameId",
                table: "Teams",
                column: "SeasonGameId",
                principalTable: "SeasonGames",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Teams_SeasonGames_SeasonGameId",
                table: "Teams");

            migrationBuilder.DropTable(
                name: "SeasonGames");

            migrationBuilder.DropTable(
                name: "Games");

            migrationBuilder.DropTable(
                name: "Seasons");

            migrationBuilder.DropIndex(
                name: "IX_Teams_SeasonGameId",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "SeasonGameId",
                table: "Teams");
        }
    }
}
