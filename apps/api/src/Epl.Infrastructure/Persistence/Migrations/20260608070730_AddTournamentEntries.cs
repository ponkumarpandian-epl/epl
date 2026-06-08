using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TournamentEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TournamentCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Player1Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Player1Mobile = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Player1UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Player2Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Player2Mobile = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Player2UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TeamLabel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Seed = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TournamentEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TournamentEntries_TournamentCategories_TournamentCategoryId",
                        column: x => x.TournamentCategoryId,
                        principalTable: "TournamentCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TournamentEntries_TournamentCategoryId",
                table: "TournamentEntries",
                column: "TournamentCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentEntries_TournamentCategoryId_Player1Mobile",
                table: "TournamentEntries",
                columns: new[] { "TournamentCategoryId", "Player1Mobile" },
                unique: true,
                filter: "[Status] <> 3");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TournamentEntries");
        }
    }
}
