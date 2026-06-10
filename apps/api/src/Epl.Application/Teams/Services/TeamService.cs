using Epl.Application.Common.Caching;
using Epl.Application.Teams.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Teams.Services;

/// <summary>
/// Team registration + admin status / payment workflow.
///
/// Caching:
///   - Public listing per sport slug is cached (key family <c>teams:</c>) — see
///     plan/13 §Core contract. Writes (Create / SetStatus) invalidate that family
///     in the same service method, before the action returns.
///   - SetPaymentAsync does NOT mutate any field exposed on the public DTOs,
///     so it does not invalidate the teams cache.
/// </summary>
public class TeamService(IUnitOfWork uow, ICacheStore cache, ILogger<TeamService> log) : ITeamService
{
    public async Task<Result<TeamResponse>> CreateAsync(CreateTeamRequest req, Guid? currentUserId, CancellationToken ct = default)
    {
        // ── Resolve which SeasonGame this registration is for ─────────────
        // 1) explicit SeasonGameId wins
        // 2) otherwise look up the active season + game matching req.Sport
        SeasonGame? seasonGame;
        if (req.SeasonGameId.HasValue)
        {
            seasonGame = await uow.SeasonGames.GetWithGameAsync(req.SeasonGameId.Value, ct);
            if (seasonGame is null)
                return Result<TeamResponse>.Fail("season_game_not_found",
                    "The selected sport for this season was not found.");
        }
        else
        {
            // Find active season's row for this Sport
            var allActive = await uow.Seasons.GetActiveWithGamesAsync(ct);
            seasonGame = allActive?.Games.FirstOrDefault(sg => sg.Game.Kind == req.Sport);
            if (seasonGame is null)
                return Result<TeamResponse>.Fail("no_active_season_game",
                    $"{req.Sport} isn't open for registration this season.");
        }

        if (!seasonGame.RegistrationOpen || !seasonGame.Season.RegistrationOpen)
            return Result<TeamResponse>.Fail("registration_closed",
                $"Registration for {seasonGame.Game.Name} is closed.");

        // ── Apartment dedup ────────────────────────────────────────────────
        var lat = Math.Round(req.ApartmentLat, 6);
        var lng = Math.Round(req.ApartmentLng, 6);

        var apt = await uow.Apartments.FindNearAsync(lat, lng, ct);
        if (apt is null)
        {
            apt = uow.Apartments.Add(new Apartment
            {
                Name        = req.ApartmentName.Trim(),
                Lat         = lat,
                Lng         = lng,
                Address     = req.ApartmentAddress.Trim(),
                MapProvider = "osm",
            });
        }

        // ── Duplicate team check (same sport, same name, same apartment) ──
        var teamName = req.TeamName.Trim();
        if (apt.Id != Guid.Empty && await uow.Teams.ExistsByNameInApartmentAsync(teamName, seasonGame.Game.Kind, apt.Id, ct))
        {
            return Result<TeamResponse>.Fail("duplicate_team",
                $"A {seasonGame.Game.Name} team named \"{teamName}\" is already registered for this apartment.");
        }

        var team = uow.Teams.Add(new Team
        {
            SeasonGameId    = seasonGame.Id,
            Sport           = seasonGame.Game.Kind,                  // denormalised — always matches SeasonGame.Game.Kind
            Name            = teamName,
            Apartment       = apt,
            CaptainName     = req.CaptainName.Trim(),
            CaptainMobile   = req.CaptainMobile.Trim(),
            CreatedByUserId = currentUserId,
        });

        await uow.SaveChangesAsync(ct);

        // INVALIDATION: a new Active team may show on the public listing for its sport.
        // Drop the whole teams family — cheap and correct.
        cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix);

        log.LogInformation(
            "Team {TeamId} ({Sport}) registered for {Season}/{Game} by user {UserId} apartment {ApartmentId}",
            team.Id, team.Sport, seasonGame.Season.Name, seasonGame.Game.Name,
            currentUserId?.ToString() ?? "(anonymous)", apt.Id);

        return Result<TeamResponse>.Ok(ToResponse(team, apt, seasonGame.Season.Name));
    }

    public async Task<PagedResponse<TeamResponse>> ListAsync(TeamListQuery q, CancellationToken ct = default)
    {
        var page     = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);

        var (items, total) = await uow.Teams.ListAsync(q.Sport, q.Search, q.SeasonId, q.Status, page, pageSize, ct);

        var dtos = items.Select(t => ToResponse(t, t.Apartment, t.SeasonGame?.Season?.Name)).ToList();
        return new PagedResponse<TeamResponse>(dtos, total, page, pageSize);
    }

    public async Task<TeamResponse?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var t = await uow.Teams.GetWithApartmentAsync(id, ct);
        return t is null ? null : ToResponse(t, t.Apartment, t.SeasonGame?.Season?.Name);
    }

    public async Task<Result<TeamResponse>> SetPaymentAsync(Guid teamId, bool paid, string? paidTo, CancellationToken ct = default)
    {
        // GetByIdAsync uses Set.FindAsync — returns a TRACKED entity.
        var team = await uow.Teams.GetByIdAsync(teamId, ct);
        if (team is null) return Result<TeamResponse>.Fail("team_not_found", "Team not found.");

        var trimmedPaidTo = string.IsNullOrWhiteSpace(paidTo) ? null : paidTo.Trim();
        team.PaymentCompleted = paid;
        team.PaidTo           = paid ? trimmedPaidTo : null;
        team.PaidAt           = paid ? DateTimeOffset.UtcNow : null;

        await uow.SaveChangesAsync(ct);
        log.LogInformation(
            "Team {TeamId} payment set to {State} (paidTo={PaidTo})",
            teamId, paid ? "PAID" : "UNPAID", team.PaidTo ?? "(none)");

        var refreshed = await uow.Teams.GetWithApartmentAsync(teamId, ct);
        return Result<TeamResponse>.Ok(ToResponse(refreshed!, refreshed!.Apartment, refreshed.SeasonGame?.Season?.Name));
    }

    public async Task<Result<TeamResponse>> SetStatusAsync(Guid teamId, TeamStatus status, string? comment, CancellationToken ct = default)
    {
        var team = await uow.Teams.GetByIdAsync(teamId, ct);
        if (team is null) return Result<TeamResponse>.Fail("team_not_found", "Team not found.");

        var trimmed = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        team.Status        = status;
        team.StatusComment = trimmed;

        await uow.SaveChangesAsync(ct);

        // INVALIDATION: status change can move the team in or out of the public
        // Active list. Drop the whole family.
        cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix);

        log.LogInformation(
            "Team {TeamId} status set to {Status} (comment={Comment})",
            teamId, status, trimmed ?? "(none)");

        var refreshed = await uow.Teams.GetWithApartmentAsync(teamId, ct);
        return Result<TeamResponse>.Ok(ToResponse(refreshed!, refreshed!.Apartment, refreshed.SeasonGame?.Season?.Name));
    }

    public Task<IReadOnlyList<TeamPublicSummaryDto>?> ListPublicByGameSlugCachedAsync(string sportSlug, CancellationToken ct = default)
        => cache.GetOrCreateAsync<IReadOnlyList<TeamPublicSummaryDto>>(
            CacheKeys.TeamsPublicByGameSlug(sportSlug),
            CacheTtl.Default,
            async token =>
            {
                var rows = await uow.Teams.ListActiveByActiveSeasonGameSlugAsync(sportSlug, token);
                return rows
                    .Select(t => new TeamPublicSummaryDto(t.Id, t.Sport, t.Name, t.Apartment.Name, t.CaptainName))
                    .ToList();
            }, ct);

    public async Task<IReadOnlyList<TeamPublicSummaryDto>> ListPublicByGameSlugAsync(string sportSlug, CancellationToken ct = default)
        => (await ListPublicByGameSlugCachedAsync(sportSlug, ct)) ?? Array.Empty<TeamPublicSummaryDto>();

    private static TeamResponse ToResponse(Team t, Apartment apt, string? seasonName) => new(
        t.Id, t.Sport, t.Name,
        apt.Name, apt.Address, apt.Lat, apt.Lng,
        t.CaptainName, t.CaptainMobile,
        t.SeasonGameId, seasonName,
        t.CreatedAt,
        t.PaymentCompleted, t.PaidTo, t.PaidAt,
        t.Status, t.StatusComment);
}
