using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSeasonGameRulesFacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FormatNote",
                table: "SeasonGames",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Hashtag",
                table: "SeasonGames",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RegistrationDeadline",
                table: "SeasonGames",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationUrl",
                table: "SeasonGames",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportingTime",
                table: "SeasonGames",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SquadNote",
                table: "SeasonGames",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            // ── Backfill rules-page facts for the existing Season 2 sports ─────
            // Each UPDATE is idempotent — only fills NULL columns, so a re-run
            // (or local DBs that already populated some fields manually) is safe.
            // Match by Games.Kind enum: 1=Cricket, 2=Badminton, 3=Volleyball.
            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.Hashtag         = COALESCE(SG.Hashtag,         '#BeyondBoundaries'),
                       SG.RegistrationUrl = COALESCE(SG.RegistrationUrl, 'https://tinyurl.com/EPLCricketRegister'),
                       SG.FormatNote      = COALESCE(SG.FormatNote,      'Red tennis ball'),
                       SG.SquadNote       = COALESCE(SG.SquadNote,       'Up to 15 players')
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind = 1;
            ");

            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.Hashtag              = COALESCE(SG.Hashtag,              '#BattleofBaddies'),
                       SG.RegistrationUrl      = COALESCE(SG.RegistrationUrl,      'https://tinyurl.com/EPL-BadmintonRegister'),
                       SG.ReportingTime        = COALESCE(SG.ReportingTime,        '6:00 AM'),
                       SG.RegistrationDeadline = COALESCE(SG.RegistrationDeadline, CAST('2026-06-07T18:30:00+00:00' AS datetimeoffset)),
                       SG.FormatNote           = COALESCE(SG.FormatNote,           '5 doubles per team (4 Men''s + 1 Women''s)'),
                       SG.SquadNote            = COALESCE(SG.SquadNote,            '10 – 13 players incl. 3 backups')
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind = 2;
            ");

            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.FormatNote = COALESCE(SG.FormatNote, '6-a-side · no libero · rally scoring'),
                       SG.SquadNote  = COALESCE(SG.SquadNote,  '12 in squad · 6 on court')
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind = 3;
            ");

            // ── Promote midnight StartsOn → match-start hour so /rules can compute
            //    reporting time = startsOn − 1h. Only rewrites rows that still
            //    have midnight (00:00:00) — admin-set times are preserved.
            //    9:00 AM IST for cricket & volleyball, 7:00 AM for badminton.
            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.StartsOn = DATEADD(hour, 9, SG.StartsOn)
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind IN (1, 3)
                   AND SG.StartsOn IS NOT NULL
                   AND DATEPART(hour, SG.StartsOn) = 0
                   AND DATEPART(minute, SG.StartsOn) = 0;
            ");
            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.StartsOn = DATEADD(hour, 7, SG.StartsOn)
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind = 2
                   AND SG.StartsOn IS NOT NULL
                   AND DATEPART(hour, SG.StartsOn) = 0
                   AND DATEPART(minute, SG.StartsOn) = 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FormatNote",
                table: "SeasonGames");

            migrationBuilder.DropColumn(
                name: "Hashtag",
                table: "SeasonGames");

            migrationBuilder.DropColumn(
                name: "RegistrationDeadline",
                table: "SeasonGames");

            migrationBuilder.DropColumn(
                name: "RegistrationUrl",
                table: "SeasonGames");

            migrationBuilder.DropColumn(
                name: "ReportingTime",
                table: "SeasonGames");

            migrationBuilder.DropColumn(
                name: "SquadNote",
                table: "SeasonGames");
        }
    }
}
