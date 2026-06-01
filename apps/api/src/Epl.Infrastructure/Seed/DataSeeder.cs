using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Epl.Infrastructure.Seed;

/// <summary>
/// Seeds the master tables: Games (Cricket, Badminton, Volleyball) + Season 2 (2026) +
/// its three SeasonGames with venue / fee / contacts / WhatsApp links.
/// Idempotent — safe to run on every startup.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider sp, CancellationToken ct = default)
    {
        var db  = sp.GetRequiredService<AppDbContext>();
        var log = sp.GetRequiredService<ILogger<DataSeederMarker>>();

        // ── 1) Games (master) ───────────────────────────────────────────────
        var cricket = await db.Games.FirstOrDefaultAsync(g => g.Kind == Sport.Cricket, ct);
        if (cricket is null)
        {
            cricket = new Game
            {
                Name             = "Cricket",
                Slug             = "cricket",
                Kind             = Sport.Cricket,
                Description      = "Inter-apartment cricket - leather-ball, 6 overs a side.",
                WhatsAppGroupUrl = "https://tinyurl.com/EPLCricketwhatsapp",
            };
            db.Games.Add(cricket);
            log.LogInformation("Seeded Game: Cricket");
        }

        var badminton = await db.Games.FirstOrDefaultAsync(g => g.Kind == Sport.Badminton, ct);
        if (badminton is null)
        {
            badminton = new Game
            {
                Name             = "Badminton",
                Slug             = "badminton",
                Kind             = Sport.Badminton,
                Description      = "Men's & Women's doubles, BWF-style match format.",
                WhatsAppGroupUrl = "https://tinyurl.com/EPLBadmintonwhatsapp",
            };
            db.Games.Add(badminton);
            log.LogInformation("Seeded Game: Badminton");
        }

        var volleyball = await db.Games.FirstOrDefaultAsync(g => g.Kind == Sport.Volleyball, ct);
        if (volleyball is null)
        {
            volleyball = new Game
            {
                Name             = "Volleyball",
                Slug             = "volleyball",
                Kind             = Sport.Volleyball,
                Description      = "Men's volleyball, best-of-three rally-point sets.",
                WhatsAppGroupUrl = "https://tinyurl.com/EPLVolleyballwhatsapp",
            };
            db.Games.Add(volleyball);
            log.LogInformation("Seeded Game: Volleyball");
        }

        await db.SaveChangesAsync(ct);

        // ── 2) Season 2 (2026) ──────────────────────────────────────────────
        var season2 = await db.Seasons.FirstOrDefaultAsync(s => s.Slug == "season-2", ct);
        if (season2 is null)
        {
            season2 = new Season
            {
                Name             = "Season 2",
                Year             = 2026,
                Slug             = "season-2",
                Tagline          = "Pride of E-City",
                StartsOn         = new DateTimeOffset(2026, 6, 13, 0, 0, 0, TimeSpan.FromHours(5.5)),
                EndsOn           = new DateTimeOffset(2026, 6, 28, 23, 59, 59, TimeSpan.FromHours(5.5)),
                IsActive         = true,
                RegistrationOpen = true,
            };
            db.Seasons.Add(season2);
            await db.SaveChangesAsync(ct);
            log.LogInformation("Seeded Season {SeasonName} ({Year})", season2.Name, season2.Year);
        }

        // ── 3) SeasonGames — one row per (Season 2 × Game) ──────────────────
        await SeedSeasonGameAsync(db, log, ct,
            season: season2, game: cricket,
            // 9:00 AM IST start — reporting card on /rules computes startsOn − 1h = 8:00 AM.
            startsOn: new DateTimeOffset(2026, 6, 13, 9, 0, 0, TimeSpan.FromHours(5.5)),
            endsOn:   new DateTimeOffset(2026, 6, 14, 23, 59, 59, TimeSpan.FromHours(5.5)),
            venue: "JMR Cricket Ground, EC Phase 1",
            categories: "Men's",
            entryFee: 6500,
            cardImageUrl: "/card-cricket.jpg",
            whatsAppOverride: "https://tinyurl.com/EPLCricketwhatsapp",
            contacts: new()
            {
                new() { Name = "Christo",  PhoneDisplay = "97902 42834", PhoneE164 = "+919790242834" },
                new() { Name = "Nagaraj",  PhoneDisplay = "81978 01827", PhoneE164 = "+918197801827" },
                new() { Name = "Ponkumar", PhoneDisplay = "95913 37122", PhoneE164 = "+919591337122" },
            });

        await SeedSeasonGameAsync(db, log, ct,
            season: season2, game: badminton,
            // 7:00 AM IST start — reporting card computes 6:00 AM (matches the PDF).
            startsOn: new DateTimeOffset(2026, 6, 20, 7, 0, 0, TimeSpan.FromHours(5.5)),
            endsOn:   new DateTimeOffset(2026, 6, 20, 23, 59, 59, TimeSpan.FromHours(5.5)),
            venue: "In & around Electronic City",
            categories: "Men's & Women's Doubles",
            entryFee: 6000,
            cardImageUrl: "/card-badminton.jpg",
            whatsAppOverride: "https://tinyurl.com/EPLBadmintonwhatsapp",
            contacts: new()
            {
                new() { Name = "Deepak J", PhoneDisplay = "96868 00057", PhoneE164 = "+919686800057" },
                new() { Name = "Sathish",  PhoneDisplay = "72594 12307", PhoneE164 = "+917259412307" },
            });

        await SeedSeasonGameAsync(db, log, ct,
            season: season2, game: volleyball,
            // 9:00 AM IST start — reporting card computes 8:00 AM.
            startsOn: new DateTimeOffset(2026, 6, 27, 9, 0, 0, TimeSpan.FromHours(5.5)),
            endsOn:   new DateTimeOffset(2026, 6, 28, 23, 59, 59, TimeSpan.FromHours(5.5)),
            venue: "In & around Electronic City",
            categories: "Men's",
            entryFee: 3000,
            cardImageUrl: "/card-volleyball.jpg",
            whatsAppOverride: "https://tinyurl.com/EPLVolleyballwhatsapp",
            contacts: new()
            {
                new() { Name = "Abdul",   PhoneDisplay = "94481 80435", PhoneE164 = "+919448180435" },
                new() { Name = "Roopesh", PhoneDisplay = "95660 62356", PhoneE164 = "+919566062356" },
            });

        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedSeasonGameAsync(
        AppDbContext db,
        ILogger log,
        CancellationToken ct,
        Season season,
        Game game,
        DateTimeOffset startsOn,
        DateTimeOffset endsOn,
        string venue,
        string categories,
        int entryFee,
        string cardImageUrl,
        string whatsAppOverride,
        List<SeasonGameContact> contacts)
    {
        var existing = await db.SeasonGames
            .FirstOrDefaultAsync(sg => sg.SeasonId == season.Id && sg.GameId == game.Id, ct);
        if (existing is not null) return;

        db.SeasonGames.Add(new SeasonGame
        {
            SeasonId         = season.Id,
            GameId           = game.Id,
            StartsOn         = startsOn,
            EndsOn           = endsOn,
            Venue            = venue,
            Categories       = categories,
            EntryFeeRupees   = entryFee,
            CardImageUrl     = cardImageUrl,
            WhatsAppGroupUrl = whatsAppOverride,
            RegistrationOpen = true,
            Contacts         = contacts,
        });

        log.LogInformation("Seeded SeasonGame: {Season} × {Game}", season.Name, game.Name);
    }

    private sealed class DataSeederMarker { }
}
