using Epl.Application.Authorization;
using Epl.Application.Seasons.Dtos;
using Epl.Application.Seasons.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/seasons")]
public class SeasonsController(ISeasonService seasons) : ControllerBase
{
    // ── Public ─────────────────────────────────────────────────────────────

    [HttpGet("current")]
    [AllowAnonymous]
    [ResponseCache(Duration = 60)]
    public async Task<IActionResult> GetCurrent(CancellationToken ct)
    {
        var s = await seasons.GetCurrentAsync(ct);
        return s is null
            ? NotFound(new { code = "no_active_season", message = "No season is currently active." })
            : Ok(s);
    }

    [HttpGet("current/registration-stats")]
    [AllowAnonymous]
    [ResponseCache(Duration = 60)]
    public async Task<IActionResult> GetCurrentRegistrationStats(CancellationToken ct)
    {
        var stats = await seasons.GetCurrentRegistrationStatsAsync(ct);
        return stats is null
            ? NotFound(new { code = "no_active_season", message = "No season is currently active." })
            : Ok(stats);
    }

    [HttpGet("games")]
    [AllowAnonymous]
    public async Task<IActionResult> ListGames(CancellationToken ct)
    {
        var games = await seasons.ListGamesAsync(ct);
        return Ok(games);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var s = await seasons.GetByIdAsync(id, ct);
        return s is null ? NotFound() : Ok(s);
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var all = await seasons.ListAllAsync(ct);
        return Ok(all);
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Create([FromBody] CreateSeasonRequest req, CancellationToken ct)
    {
        var result = await seasons.CreateAsync(req, ct);
        if (!result.IsSuccess)
            return Conflict(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message });
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPost("{seasonId:guid}/games")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> AddGame(Guid seasonId, [FromBody] AddSeasonGameRequest req, CancellationToken ct)
    {
        var result = await seasons.AddGameAsync(seasonId, req, ct);
        if (!result.IsSuccess)
            return result.Error!.Value.Code switch
            {
                "season_not_found" or "game_not_found" => NotFound(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message }),
                "duplicate_season_game"                 => Conflict(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message }),
                _                                       => BadRequest(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message }),
            };
        return Ok(result.Value);
    }

    [HttpPost("{seasonId:guid}/activate")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetActive(Guid seasonId, CancellationToken ct)
    {
        var result = await seasons.SetActiveAsync(seasonId, ct);
        if (!result.IsSuccess) return NotFound(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message });
        return Ok(result.Value);
    }

    public record SetRegistrationRequest(bool Open);

    [HttpPost("{seasonId:guid}/registration")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetRegistration(Guid seasonId, [FromBody] SetRegistrationRequest req, CancellationToken ct)
    {
        var result = await seasons.SetRegistrationAsync(seasonId, req.Open, ct);
        if (!result.IsSuccess) return NotFound(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message });
        return Ok(result.Value);
    }

    [HttpPost("{seasonId:guid}/games/{seasonGameId:guid}/registration")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetGameRegistration(Guid seasonId, Guid seasonGameId, [FromBody] SetRegistrationRequest req, CancellationToken ct)
    {
        var result = await seasons.SetGameRegistrationAsync(seasonId, seasonGameId, req.Open, ct);
        if (!result.IsSuccess)
            return result.Error!.Value.Code switch
            {
                "season_game_not_found"  => NotFound(new   { code = result.Error!.Value.Code, message = result.Error!.Value.Message }),
                "season_game_mismatch"   => BadRequest(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message }),
                _                        => BadRequest(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message }),
            };
        return Ok(result.Value);
    }
}
