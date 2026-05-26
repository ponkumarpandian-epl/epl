using Epl.Application.Teams.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Teams.Services;

public class TeamService(IUnitOfWork uow, ILogger<TeamService> log) : ITeamService
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

        var (items, total) = await uow.Teams.ListAsync(q.Sport, q.Search, q.SeasonId, page, pageSize, ct);

        var dtos = items.Select(t => ToResponse(t, t.Apartment, t.SeasonGame?.Season?.Name)).ToList();
        return new PagedResponse<TeamResponse>(dtos, total, page, pageSize);
    }

    public async Task<TeamResponse?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var t = await uow.Teams.GetWithApartmentAsync(id, ct);
        return t is null ? null : ToResponse(t, t.Apartment, t.SeasonGame?.Season?.Name);
    }

    private static TeamResponse ToResponse(Team t, Apartment apt, string? seasonName) => new(
        t.Id, t.Sport, t.Name,
        apt.Name, apt.Address, apt.Lat, apt.Lng,
        t.CaptainName, t.CaptainMobile,
        t.SeasonGameId, seasonName,
        t.CreatedAt);
}
