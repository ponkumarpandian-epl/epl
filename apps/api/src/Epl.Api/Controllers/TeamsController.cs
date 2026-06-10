using System.Security.Claims;
using Epl.Application.Authorization;
using Epl.Application.Teams.Dtos;
using Epl.Application.Teams.Services;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/teams")]
public class TeamsController(ITeamService teams) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateTeamRequest req, CancellationToken ct)
    {
        // Team registration is intentionally open — no login required.
        // If a user happens to be signed in, we still capture them as the creator.
        Guid? uid = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsed)
            ? parsed
            : null;

        var result = await teams.CreateAsync(req, uid, ct);
        if (!result.IsSuccess)
        {
            return result.Error!.Value.Code == "duplicate_team"
                ? Conflict(new { code = result.Error.Value.Code, message = result.Error.Value.Message })
                : BadRequest(new { code = result.Error.Value.Code, message = result.Error.Value.Message });
        }
        return CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, result.Value);
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> List(
        [FromQuery] Sport?       sport,
        [FromQuery] string?      search,
        [FromQuery] Guid?        seasonId,
        [FromQuery] TeamStatus?  status,
        [FromQuery] int          page = 1,
        [FromQuery] int          pageSize = 20,
        CancellationToken ct = default)
    {
        var data = await teams.ListAsync(new TeamListQuery(sport, search, seasonId, status, page, pageSize), ct);
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var t = await teams.GetAsync(id, ct);
        return t is null ? NotFound() : Ok(t);
    }

    public record SetPaymentRequest(bool Paid, string? PaidTo);

    [HttpPatch("{id:guid}/payment")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetPayment(Guid id, [FromBody] SetPaymentRequest req, CancellationToken ct)
    {
        var result = await teams.SetPaymentAsync(id, req.Paid, req.PaidTo, ct);
        if (!result.IsSuccess)
            return NotFound(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message });
        return Ok(result.Value);
    }

    // ── Admin: lifecycle status (Active / Withdrawn / Waitlist) ──────────

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetTeamStatusRequest req, CancellationToken ct)
    {
        var result = await teams.SetStatusAsync(id, req.Status, req.Comment, ct);
        if (!result.IsSuccess)
            return NotFound(new { code = result.Error!.Value.Code, message = result.Error!.Value.Message });
        return Ok(result.Value);
    }

    // ── Active-teams listing for a sport, gated to Players + Admins ──────
    // The three fields surfaced (team / apartment / captain name) are the
    // only player-safe data; mobile and payment stay admin-only via the
    // controller above. PlayerOrAdmin so a direct API hit can't bypass the
    // page-level gate on /teams/by-game/[slug].

    [HttpGet("by-game/{sportSlug}")]
    [Authorize(Policy = AuthorizationPolicies.PlayerOrAdmin)]
    public async Task<IActionResult> ListByGame(string sportSlug, CancellationToken ct)
    {
        var rows = await teams.ListPublicByGameSlugAsync(sportSlug, ct);
        return Ok(rows);
    }
}
