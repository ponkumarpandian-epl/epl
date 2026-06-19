using Epl.Application.Authorization;
using Epl.Application.Teams.Dtos;
using Epl.Application.Teams.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

/// <summary>
/// Captain-scoped roster management for one team (plan/10 §3.1). The policy only
/// gates "authenticated"; the per-team captain check runs in the service via the
/// actor + admin flag passed from here. Roster reads (which carry masked mobiles)
/// are limited to the captain/admin until the public team page (C-8) ships a
/// phone-free projection.
/// </summary>
[ApiController]
[Route("api/teams/{teamId:guid}")]
[Authorize(Policy = AuthorizationPolicies.TeamCaptainOrAdmin)]
public class TeamMembersController(ITeamMemberService members, ITeamAuthService teamAuth) : ApiControllerBase
{
    [HttpGet("members")]
    public async Task<IActionResult> GetRoster(Guid teamId, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        if (!IsAdmin && !await teamAuth.IsCaptainAsync(teamId, uid, ct))
            return Fail(new("forbidden", "Only the team captain can view this roster."));

        var roster = await members.GetRosterAsync(teamId, ct);
        return roster is null ? NotFound() : Ok(roster);
    }

    [HttpPost("members")]
    public async Task<IActionResult> AddMember(Guid teamId, [FromBody] AddTeamMemberRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.AddMemberAsync(teamId, req, uid, IsAdmin, ct);
        return result.IsSuccess ? Ok(result.Value) : Fail(result.Error!.Value);
    }

    [HttpPut("members/{memberId:guid}")]
    public async Task<IActionResult> UpdateMember(Guid teamId, Guid memberId, [FromBody] UpdateTeamMemberRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.UpdateMemberAsync(teamId, memberId, req, uid, IsAdmin, ct);
        return result.IsSuccess ? Ok(result.Value) : Fail(result.Error!.Value);
    }

    [HttpDelete("members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid teamId, Guid memberId, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.RemoveMemberAsync(teamId, memberId, uid, IsAdmin, ct);
        return result.IsSuccess ? NoContent() : Fail(result.Error!.Value);
    }

    /// <summary>Transfer captaincy to another Active member (plan/10 §3.1, C-6).</summary>
    [HttpPut("captain")]
    public async Task<IActionResult> TransferCaptaincy(Guid teamId, [FromBody] TransferCaptaincyRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.TransferCaptaincyAsync(teamId, req.NewCaptainUserId, uid, IsAdmin, ct);
        return result.IsSuccess ? NoContent() : Fail(result.Error!.Value);
    }

    /// <summary>Recent roster changes for the captain's audit strip (plan/10 §4.2, C-7).</summary>
    [HttpGet("roster-changes")]
    public async Task<IActionResult> RecentChanges(Guid teamId, [FromQuery] int limit = 10, CancellationToken ct = default)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        if (!IsAdmin && !await teamAuth.IsCaptainAsync(teamId, uid, ct))
            return Fail(new("forbidden", "Only the team captain can view roster history."));

        var changes = await members.ListRecentChangesAsync(teamId, Math.Clamp(limit, 1, 50), ct);
        return Ok(changes);
    }
}
