using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epl.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SetMatchStartTimes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Per-sport match start times (IST) ─────────────────────────────
            //   Cricket    = 6:30 AM     (reporting 5:30 AM)
            //   Badminton  = 7:00 AM     (reporting 6:00 AM — matches PDF)
            //   Volleyball = 5:00 PM     (reporting 4:00 PM)
            //
            // Only rewrites rows whose StartsOn is at midnight (00:00) or at
            // 9:00 AM (the value the previous migration set as a placeholder).
            // Rows that an admin has already customised to a different time are
            // preserved untouched. Games.Kind enum: 1=Cricket, 2=Badminton, 3=Volleyball.

            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.StartsOn = DATETIMEOFFSETFROMPARTS(
                         DATEPART(year,  SG.StartsOn),
                         DATEPART(month, SG.StartsOn),
                         DATEPART(day,   SG.StartsOn),
                         6, 30, 0, 0,
                         DATEPART(tz, SG.StartsOn) / 60,
                         DATEPART(tz, SG.StartsOn) % 60,
                         0)
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind = 1
                   AND SG.StartsOn IS NOT NULL
                   AND (
                         (DATEPART(hour, SG.StartsOn) = 0 AND DATEPART(minute, SG.StartsOn) = 0)
                      OR (DATEPART(hour, SG.StartsOn) = 9 AND DATEPART(minute, SG.StartsOn) = 0)
                       );
            ");

            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.StartsOn = DATETIMEOFFSETFROMPARTS(
                         DATEPART(year,  SG.StartsOn),
                         DATEPART(month, SG.StartsOn),
                         DATEPART(day,   SG.StartsOn),
                         7, 0, 0, 0,
                         DATEPART(tz, SG.StartsOn) / 60,
                         DATEPART(tz, SG.StartsOn) % 60,
                         0)
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind = 2
                   AND SG.StartsOn IS NOT NULL
                   AND DATEPART(hour, SG.StartsOn) = 0
                   AND DATEPART(minute, SG.StartsOn) = 0;
            ");

            migrationBuilder.Sql(@"
                UPDATE SG
                   SET SG.StartsOn = DATETIMEOFFSETFROMPARTS(
                         DATEPART(year,  SG.StartsOn),
                         DATEPART(month, SG.StartsOn),
                         DATEPART(day,   SG.StartsOn),
                         17, 0, 0, 0,
                         DATEPART(tz, SG.StartsOn) / 60,
                         DATEPART(tz, SG.StartsOn) % 60,
                         0)
                  FROM SeasonGames SG
                  JOIN Games       G  ON G.Id = SG.GameId
                 WHERE G.Kind = 3
                   AND SG.StartsOn IS NOT NULL
                   AND (
                         (DATEPART(hour, SG.StartsOn) = 0 AND DATEPART(minute, SG.StartsOn) = 0)
                      OR (DATEPART(hour, SG.StartsOn) = 9 AND DATEPART(minute, SG.StartsOn) = 0)
                       );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op — Down would have to know each row's prior time, which we
            // don't capture. If you really need to revert, manually update the
            // SeasonGames rows.
        }
    }
}
