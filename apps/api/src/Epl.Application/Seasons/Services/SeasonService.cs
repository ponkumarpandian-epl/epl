using Epl.Application.Seasons.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Seasons.Services;

public class SeasonService(IUnitOfWork uow, ILogger<SeasonService> log) : ISeasonService
{
    public async Task<SeasonDto?> GetCurrentAsync(CancellationToken ct = default)
    {
        var s = await uow.Seasons.GetActiveWithGamesAsync(ct);
        return s is null ? null : ToDto(s);
    }

    public async Task<SeasonDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var s = await uow.Seasons.GetWithGamesAsync(id, ct);
        return s is null ? null : ToDto(s);
    }

    public async Task<IReadOnlyList<SeasonDto>> ListAllAsync(CancellationToken ct = default)
    {
        var seasons = await uow.Seasons.ListAllAsync(ct);
        var dtos    = new List<SeasonDto>(seasons.Count);
        foreach (var s in seasons)
        {
            var withGames = await uow.Seasons.GetWithGamesAsync(s.Id, ct);
            if (withGames is not null) dtos.Add(ToDto(withGames));
        }
        return dtos;
    }

    public async Task<IReadOnlyList<GameDto>> ListGamesAsync(CancellationToken ct = default)
    {
        var list = await uow.Games.ListAsync(ct);
        return list.Select(g => new GameDto(
            g.Id, g.Name, g.Slug, g.Kind, g.Description, g.WhatsAppGroupUrl, g.IsActive)).ToList();
    }

    // ── Admin ──────────────────────────────────────────────────────────────
    public async Task<Result<SeasonDto>> CreateAsync(CreateSeasonRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Slug))
            return Result<SeasonDto>.Fail("invalid_input", "Name and Slug are required.");

        var slug = req.Slug.Trim().ToLowerInvariant();
        if (await uow.Seasons.AnyAsync(s => s.Slug == slug, ct))
            return Result<SeasonDto>.Fail("duplicate_slug", $"A season with slug \"{slug}\" already exists.");

        if (req.SetActive)
        {
            // Demote any currently-active season; one-active-at-a-time invariant.
            // Must use ListAllForUpdateAsync (tracked) — generic ListAsync uses AsNoTracking.
            foreach (var s in await uow.Seasons.ListAllForUpdateAsync(ct))
            {
                if (s.IsActive) s.IsActive = false;
            }
        }

        var season = uow.Seasons.Add(new Season
        {
            Name             = req.Name.Trim(),
            Year             = req.Year,
            Slug             = slug,
            Tagline          = req.Tagline,
            StartsOn         = req.StartsOn,
            EndsOn           = req.EndsOn,
            IsActive         = req.SetActive,
            RegistrationOpen = true,
        });

        await uow.SaveChangesAsync(ct);
        log.LogInformation("Created season {SeasonId} ({Name}) active={IsActive}", season.Id, season.Name, season.IsActive);

        var withGames = await uow.Seasons.GetWithGamesAsync(season.Id, ct);
        return Result<SeasonDto>.Ok(ToDto(withGames!));
    }

    public async Task<Result<SeasonDto>> AddGameAsync(Guid seasonId, AddSeasonGameRequest req, CancellationToken ct = default)
    {
        var season = await uow.Seasons.GetByIdAsync(seasonId, ct);
        if (season is null) return Result<SeasonDto>.Fail("season_not_found", "Season not found.");

        var game = await uow.Games.GetByIdAsync(req.GameId, ct);
        if (game is null) return Result<SeasonDto>.Fail("game_not_found", "Game not found.");

        if (await uow.SeasonGames.AnyAsync(sg => sg.SeasonId == seasonId && sg.GameId == req.GameId, ct))
            return Result<SeasonDto>.Fail("duplicate_season_game",
                $"{game.Name} is already attached to season \"{season.Name}\".");

        uow.SeasonGames.Add(new SeasonGame
        {
            SeasonId         = seasonId,
            GameId           = req.GameId,
            StartsOn         = req.StartsOn,
            EndsOn           = req.EndsOn,
            Venue            = req.Venue,
            Categories       = req.Categories,
            EntryFeeRupees   = req.EntryFeeRupees,
            WhatsAppGroupUrl = req.WhatsAppGroupUrl,
            CardImageUrl     = req.CardImageUrl,
            RegistrationOpen = true,
            Contacts = (req.Contacts ?? new List<ContactDto>())
                .Select(c => new SeasonGameContact { Name = c.Name, PhoneDisplay = c.PhoneDisplay, PhoneE164 = c.PhoneE164 })
                .ToList(),
        });

        await uow.SaveChangesAsync(ct);
        log.LogInformation("Attached {Game} to season {Season}", game.Name, season.Name);

        var refreshed = await uow.Seasons.GetWithGamesAsync(seasonId, ct);
        return Result<SeasonDto>.Ok(ToDto(refreshed!));
    }

    public async Task<Result<SeasonDto>> SetActiveAsync(Guid seasonId, CancellationToken ct = default)
    {
        var target = await uow.Seasons.GetByIdAsync(seasonId, ct);
        if (target is null) return Result<SeasonDto>.Fail("season_not_found", "Season not found.");

        // Must use ListAllForUpdateAsync (tracked) — generic ListAsync uses AsNoTracking
        // and mutations to .IsActive would not persist.
        foreach (var s in await uow.Seasons.ListAllForUpdateAsync(ct))
        {
            s.IsActive = (s.Id == seasonId);
        }

        await uow.SaveChangesAsync(ct);
        log.LogInformation("Activated season {SeasonId} ({Name})", target.Id, target.Name);

        var refreshed = await uow.Seasons.GetWithGamesAsync(seasonId, ct);
        return Result<SeasonDto>.Ok(ToDto(refreshed!));
    }

    public async Task<Result<SeasonDto>> SetRegistrationAsync(Guid seasonId, bool open, CancellationToken ct = default)
    {
        // GetByIdAsync returns a TRACKED entity — property changes flow into SaveChanges.
        var season = await uow.Seasons.GetByIdAsync(seasonId, ct);
        if (season is null) return Result<SeasonDto>.Fail("season_not_found", "Season not found.");
        season.RegistrationOpen = open;

        // Master is a true override — per-game flags are preserved so admins can pre-stage
        // "Cricket closed, others open" and have that restored when the master flips back on.
        // Effective state at the registration entrypoint (TeamService) and the home page is
        // computed as (season.RegistrationOpen AND seasonGame.RegistrationOpen).
        await uow.SaveChangesAsync(ct);
        log.LogInformation(
            "Season {SeasonId} ({Name}) master registration set to {State}",
            season.Id, season.Name, open ? "OPEN" : "CLOSED");

        var refreshed = await uow.Seasons.GetWithGamesAsync(seasonId, ct);
        return Result<SeasonDto>.Ok(ToDto(refreshed!));
    }

    public async Task<Result<SeasonDto>> SetGameRegistrationAsync(Guid seasonId, Guid seasonGameId, bool open, CancellationToken ct = default)
    {
        // GetByIdAsync uses Set.FindAsync — returns a TRACKED entity.
        var sg = await uow.SeasonGames.GetByIdAsync(seasonGameId, ct);
        if (sg is null) return Result<SeasonDto>.Fail("season_game_not_found", "Sport not found in this season.");
        if (sg.SeasonId != seasonId)
            return Result<SeasonDto>.Fail("season_game_mismatch", "Sport does not belong to the specified season.");

        sg.RegistrationOpen = open;
        await uow.SaveChangesAsync(ct);
        log.LogInformation(
            "Season {SeasonId} game {SeasonGameId} registration set to {State}",
            seasonId, seasonGameId, open ? "OPEN" : "CLOSED");

        var refreshed = await uow.Seasons.GetWithGamesAsync(seasonId, ct);
        return Result<SeasonDto>.Ok(ToDto(refreshed!));
    }

    private static SeasonDto ToDto(Season s)
    {
        var games = s.Games
            .OrderBy(g => g.StartsOn ?? DateTimeOffset.MaxValue)
            .Select(sg => new SeasonGameDto(
                Id:               sg.Id,
                GameId:           sg.GameId,
                Sport:            sg.Game.Kind,
                Slug:             sg.Game.Slug,
                Name:             sg.Game.Name,
                Description:      sg.Game.Description,
                Venue:            sg.Venue,
                Categories:       sg.Categories,
                EntryFeeRupees:   sg.EntryFeeRupees,
                StartsOn:         sg.StartsOn,
                EndsOn:           sg.EndsOn,
                // SeasonGame override wins over the Game default for WhatsApp.
                WhatsAppGroupUrl: sg.WhatsAppGroupUrl ?? sg.Game.WhatsAppGroupUrl,
                CardImageUrl:     sg.CardImageUrl,
                // Raw per-game flag. Consumers (home page, TeamService guard) compute the
                // effective state as (Season.RegistrationOpen AND SeasonGame.RegistrationOpen).
                // Admin UI needs the raw value so per-game state is visible while master is OFF.
                RegistrationOpen: sg.RegistrationOpen,
                Contacts:         sg.Contacts.Select(c => new ContactDto(c.Name, c.PhoneDisplay, c.PhoneE164)).ToList()))
            .ToList();

        return new SeasonDto(
            Id:               s.Id,
            Name:             s.Name,
            Year:             s.Year,
            Slug:             s.Slug,
            Tagline:          s.Tagline,
            StartsOn:         s.StartsOn,
            EndsOn:           s.EndsOn,
            IsActive:         s.IsActive,
            RegistrationOpen: s.RegistrationOpen,
            Games:            games);
    }
}
