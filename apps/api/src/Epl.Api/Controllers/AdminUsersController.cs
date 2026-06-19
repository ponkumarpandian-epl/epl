using Epl.Application.Authorization;
using Epl.Application.Users.Dtos;
using Epl.Application.Users.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

/// <summary>Admin user &amp; role management console (plan/10 §8).</summary>
[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public class AdminUsersController(IUserRoleAdminService svc) : ApiControllerBase
{
    [HttpGet("")]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] string? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        => Ok(await svc.SearchAsync(q, role, page, pageSize, ct));

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> Get(Guid userId, CancellationToken ct)
    {
        var detail = await svc.GetAsync(userId, ct);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost("{userId:guid}/roles")]
    public async Task<IActionResult> Grant(Guid userId, [FromBody] GrantRoleRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        var result = await svc.GrantAsync(userId, req.Role, actor, ct);
        return result.IsSuccess ? Ok(new { ok = true }) : Fail(result.Error!.Value);
    }

    [HttpDelete("{userId:guid}/roles/{role}")]
    public async Task<IActionResult> Revoke(Guid userId, string role, CancellationToken ct)
    {
        if (!TryGetUserId(out var actor)) return Unauthorized();
        var result = await svc.RevokeAsync(userId, role, actor, ct);
        return result.IsSuccess ? NoContent() : Fail(result.Error!.Value);
    }
}
