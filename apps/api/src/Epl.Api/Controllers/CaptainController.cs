using Epl.Application.Authorization;
using Epl.Application.Teams.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/captain")]
[Authorize(Policy = AuthorizationPolicies.TeamCaptainOrAdmin)]
public class CaptainController(ITeamMemberService members) : ApiControllerBase
{
    /// <summary>Teams the signed-in user captains (plan/10 §3.1).</summary>
    [HttpGet("teams")]
    public async Task<IActionResult> MyTeams(CancellationToken ct)
    {
        if (!TryGetUserId(out var uid)) return Unauthorized();
        return Ok(await members.ListCaptainTeamsAsync(uid, ct));
    }
}
