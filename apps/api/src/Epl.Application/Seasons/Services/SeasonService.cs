using Epl.Application.Common.Caching;
using Epl.Application.Seasons.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Seasons.Services;

/// <summary>
/// Season + per-season SeasonGame orchestration. Reads are cached via <see cref="ICacheStore"/>;
/// every write path invalidates the touched keys BEFORE returning success
/// (see plan/13-readside-inmemory-cache.md §Core contract).
///
/// Cache invariants:
///   - <c>season:active</c> is invalidated on every write because any of them can flip the
///     "which season is active" pointer (CreateAsync with SetActive=true, SetActiveAsync) or
///     mutate fields embedded in the active-season DTO (AddGame, SetRegistration, SetGameRegistration).
///   - <c>season:{id}</c> for the affected id is also invalidated.
///   - Over-invalidating is safe (Remove on a missing key is a no-op). Under-invalidating
///     is a correctness bug — when in doubt, drop more keys.
/// </summary>
public class SeasonService(IUnitOfWork uow, ICacheStore cache, ILogger<SeasonService> log) : ISeasonService
{
    public Task<SeasonDto?> GetCurrentAsync(CancellationToken ct = default)
        => cache.GetOrCreateAsync(CacheKeys.SeasonActive, CacheTtl.Default, async token =>
        {
            var s = await uow.Seasons.GetActiveWithGamesAsync(token);
            return s is null ? null : ToDto(s);
        }, ct);

    public Task<SeasonDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => cache.GetOrCreateAsync(CacheKeys.SeasonById(id), CacheTtl.Default, async token =>
        {
            var s = await uow.Seasons.GetWithGamesAsync(id, token);
            return s is null ? null : ToDto(s);
        }, ct);

    public async Task<IReadOnlyList<SeasonDto>> ListAllAsync(CancellationToken ct = default)
    {
        // Admin-only endpoint, low traffic. Skip a top-level list cache — the per-id calls
        // below already hit cache.SeasonById, so warm pages share work between admin views.
        var seasons = await uow.Seasons.ListAllAsync(ct);
        var dtos    = new List<SeasonDto>(seasons.Count);
        foreach (var s in seasons)
        {
            var dto = await GetByIdAsync(s.Id, ct);   // cached per-id lookup
            if (dto is not null) dtos.Add(dto);
        }
        return dtos;
    }

    public Task<IReadOnlyList<GameDto>?> ListGamesAsyncCached(CancellationToken ct = default)
        => cache.GetOrCreateAsync<IReadOnlyList<GameDto>>(CacheKeys.GamesAll, CacheTtl.Default, async token =>
        {
            var list = await uow.Games.ListAsync(token);
            return list.Select(g => new GameDto(
                g.Id, g.Name, g.Slug, g.Kind, g.Description, g.WhatsAppGroupUrl, g.IsActive)).ToList();
        }, ct);

    public async Task<IReadOnlyList<GameDto>> ListGamesAsync(CancellationToken ct = default)
        => (await ListGamesAsyncCached(ct)) ?? Array.Empty<GameDto>();

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

        // INVALIDATION: if this season took over the active flag, the cached "season:active"
        // and the previously-active season's per-id cache both need to go. We don't know the
        // previous id without a query, so blow the whole family — cheap and correct.
        if (req.SetActive) cache.RemoveByPrefix(CacheKeys.SeasonFamilyPrefix);
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

        // INVALIDATION: the season's per-id DTO embeds its games; "season:active" also
        // embeds them if this happens to be the active season. Drop both.
        cache.Remove(CacheKeys.SeasonById(seasonId));
        cache.Remove(CacheKeys.SeasonActive);
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

        // INVALIDATION: this flipped IsActive on potentially every season row. Cheapest
        // correct move is to blow the whole family — every per-id DTO's IsActive flag
        // may now be stale.
        cache.RemoveByPrefix(CacheKeys.SeasonFamilyPrefix);
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

        // INVALIDATION: changes RegistrationOpen on the row. Both per-id and active keys
        // expose this flag — drop both.
        cache.Remove(CacheKeys.SeasonById(seasonId));
        cache.Remove(CacheKeys.SeasonActive);
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

        // INVALIDATION: the SeasonGame's RegistrationOpen flag is embedded in the parent
        // SeasonDto's Games[] — drop the season's cached DTOs so the rules / register
        // pages immediately reflect the toggle.
        cache.Remove(CacheKeys.SeasonById(seasonId));
        cache.Remove(CacheKeys.SeasonActive);
        log.LogInformation(
            "Season {SeasonId} game {SeasonGameId} registration set to {State}",
            seasonId, seasonGameId, open ? "OPEN" : "CLOSED");

        var refreshed = await uow.Seasons.GetWithGamesAsync(seasonId, ct);
        return Result<SeasonDto>.Ok(ToDto(refreshed!));
    }

    public async Task<RegistrationStatsDto?> GetCurrentRegistrationStatsAsync(CancellationToken ct = default)
    {
        var season = await uow.Seasons.GetActiveWithGamesAsync(ct);
        if (season is null) return null;

        // Team counts per SeasonGame — single GROUP BY query inside the repository.
        var byId = await uow.Teams.CountBySeasonGameAsync(season.Id, ct);

        var sports = season.Games
            .OrderBy(sg => sg.Game.Kind)
            .Select(sg => new SportRegistrationStatDto(
                SeasonGameId:     sg.Id,
                Sport:            sg.Game.Kind,
                Slug:             sg.Game.Slug,
                Name:             sg.Game.Name,
                TeamCount:        byId.TryGetValue(sg.Id, out var c) ? c : 0,
                RegistrationOpen: sg.RegistrationOpen))
            .ToList();

        return new RegistrationStatsDto(
            SeasonId:               season.Id,
            SeasonName:             season.Name,
            MasterRegistrationOpen: season.RegistrationOpen,
            TotalTeams:             sports.Sum(s => s.TeamCount),
            Sports:                 sports);
    }

    private static SeasonDto ToDto(Season s)
    {
        var games = s.Games
            .OrderBy(g => g.StartsOn ?? DateTimeOffset.MaxValue)
            .Select(sg => new SeasonGameDto(
                Id:                   sg.Id,
                GameId:               sg.GameId,
                Sport:                sg.Game.Kind,
                Slug:                 sg.Game.Slug,
                Name:                 sg.Game.Name,
                Description:          sg.Game.Description,
                Venue:                sg.Venue,
                Categories:           sg.Categories,
                EntryFeeRupees:       sg.EntryFeeRupees,
                StartsOn:             sg.StartsOn,
                EndsOn:               sg.EndsOn,
                // SeasonGame override wins over the Game default for WhatsApp.
                WhatsAppGroupUrl:     sg.WhatsAppGroupUrl ?? sg.Game.WhatsAppGroupUrl,
                CardImageUrl:         sg.CardImageUrl,
                RegistrationUrl:      sg.RegistrationUrl,
                Hashtag:              sg.Hashtag,
                ReportingTime:        sg.ReportingTime,
                RegistrationDeadline: sg.RegistrationDeadline,
                FormatNote:           sg.FormatNote,
                SquadNote:            sg.SquadNote,
                // Raw per-game flag. Consumers (home page, TeamService guard) compute the
                // effective state as (Season.RegistrationOpen AND SeasonGame.RegistrationOpen).
                // Admin UI needs the raw value so per-game state is visible while master is OFF.
                RegistrationOpen:     sg.RegistrationOpen,
                Contacts:             sg.Contacts.Select(c => new ContactDto(c.Name, c.PhoneDisplay, c.PhoneE164)).ToList()))
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
