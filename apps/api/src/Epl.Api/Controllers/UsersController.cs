using Epl.Application.Users.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(IUserSearchService search) : ControllerBase
{
    /// <summary>
    /// Search registered users by name / mobile / email (plan/10 §3.3). Any
    /// authenticated user — captains need it to build a roster. Returns masked PII.
    /// TODO(plan §3.2 C-3): add per-user rate limiting (~5 req/s) once the app wires
    /// up AddRateLimiter; the endpoint is auth-gated and PII-masked in the meantime.
    /// </summary>
    [HttpGet("search")]
    [Authorize]
    public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] int limit = 10, CancellationToken ct = default)
        => Ok(await search.SearchAsync(q, limit, ct));
}
