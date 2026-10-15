using Epl.Application.Authorization;
using Epl.Application.Teams.Dtos;
using Epl.Application.Teams.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

/// <summary>
/// Admin overrides over any team's roster + captaincy (plan/10 §3.4, C-6). Same
/// service methods as the captain endpoints, but with the admin flag set so the
/// captain perimeter is bypassed.
/// </summary>
[ApiController]
[Route("api/admin/teams/{teamId:guid}")]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public class AdminTeamsController(ITeamMemberService members) : ApiControllerBase
{
    [HttpPut("captain")]
    public async Task<IActionResult> ReassignCaptain(Guid teamId, [FromBody] TransferCaptaincyRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.TransferCaptaincyAsync(teamId, req.NewCaptainUserId, uid, actorIsAdmin: true, ct);
        return result.IsSuccess ? NoContent() : Fail(result.Error!.Value);
    }

    [HttpPost("members")]
    public async Task<IActionResult> AddMember(Guid teamId, [FromBody] AddTeamMemberRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.AddMemberAsync(teamId, req, uid, actorIsAdmin: true, ct);
        return result.IsSuccess ? Ok(result.Value) : Fail(result.Error!.Value);
    }

    [HttpDelete("members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid teamId, Guid memberId, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.RemoveMemberAsync(teamId, memberId, uid, actorIsAdmin: true, ct);
        return result.IsSuccess ? NoContent() : Fail(result.Error!.Value);
    }
}
