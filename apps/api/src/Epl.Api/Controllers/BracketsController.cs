using Epl.Application.Authorization;
using Epl.Application.Brackets.Dtos;
using Epl.Application.Brackets.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/brackets")]
public class BracketsController(IBracketService svc) : ControllerBase
{
    // ── Public ────────────────────────────────────────────────────────────

    [HttpGet("{bracketId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublic(Guid bracketId, CancellationToken ct)
    {
        var b = await svc.GetPublicAsync(bracketId, ct);
        return b is null ? NotFound() : Ok(b);
    }

    [HttpGet("by-parent")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicByParent([FromQuery] string parentType, [FromQuery] Guid parentId, CancellationToken ct)
    {
        var b = await svc.GetPublicByParentAsync(parentType, parentId, ct);
        return b is null ? NotFound() : Ok(b);
    }

    // ── Admin ─────────────────────────────────────────────────────────────

    [HttpGet("admin/{bracketId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> GetForAdmin(Guid bracketId, CancellationToken ct)
    {
        var b = await svc.GetForAdminAsync(bracketId, ct);
        return b is null ? NotFound() : Ok(b);
    }

    [HttpGet("admin/by-parent")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> GetByParent([FromQuery] string parentType, [FromQuery] Guid parentId, CancellationToken ct)
    {
        var b = await svc.GetByParentForAdminAsync(parentType, parentId, ct);
        return b is null ? NotFound() : Ok(b);
    }

    [HttpPost("admin")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Create([FromBody] CreateBracketRequest req, CancellationToken ct)
    {
        var result = await svc.CreateAsync(req, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return CreatedAtAction(nameof(GetForAdmin), new { bracketId = result.Value!.Id }, result.Value);
    }

    [HttpPut("admin/{bracketId:guid}/seed")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Seed(Guid bracketId, [FromBody] SeedBracketRequest req, CancellationToken ct)
    {
        var result = await svc.SeedAsync(bracketId, req, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    public record PublishRequest(bool Publish);

    [HttpPost("admin/{bracketId:guid}/publish")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Publish(Guid bracketId, [FromBody] PublishRequest req, CancellationToken ct)
    {
        var result = await svc.PublishAsync(bracketId, req.Publish, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    private IActionResult MapError(Epl.Domain.Common.ResultError err) => err.Code switch
    {
        "bracket_not_found"
            or "category_not_found"     => NotFound(new { code = err.Code, message = err.Message }),
        "bracket_exists"                => Conflict(new { code = err.Code, message = err.Message }),
        "bracket_locked"
            or "unsupported_format"
            or "unsupported_parent"     => StatusCode(StatusCodes.Status409Conflict, new { code = err.Code, message = err.Message }),
        _                               => BadRequest(new { code = err.Code, message = err.Message }),
    };
}
