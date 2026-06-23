using Epl.Application.Teams.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

/// <summary>
/// Player-owned actions on their own membership rows (plan/10 §3.2). "Leave" also
/// serves as the implicit decline for anyone added against their will (decision C6).
/// </summary>
[ApiController]
[Route("api/team-members")]
[Authorize]
public class TeamMembershipController(ITeamMemberService members) : ApiControllerBase
{
    [HttpPost("{membershipId:guid}/leave")]
    public async Task<IActionResult> Leave(Guid membershipId, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.LeaveTeamAsync(membershipId, uid, ct);
        return result.IsSuccess ? NoContent() : Fail(result.Error!.Value);
    }

    [HttpPost("{id:guid}/acknowledge")]
    public async Task<IActionResult> Acknowledge(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        var result = await members.AcknowledgeLinkAsync(id, uid, ct);
        return result.IsSuccess ? Ok() : Fail(result.Error!.Value);
    }
}
