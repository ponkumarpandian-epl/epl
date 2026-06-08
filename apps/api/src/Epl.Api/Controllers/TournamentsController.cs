using System.Security.Claims;
using Epl.Application.Authorization;
using Epl.Application.Tournaments.Dtos;
using Epl.Application.Tournaments.Services;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

[ApiController]
[Route("api/tournaments")]
public class TournamentsController(
    ITournamentService svc,
    ITournamentEntryService entrySvc) : ControllerBase
{
    // ── Public ─────────────────────────────────────────────────────────────

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> ListPublished(CancellationToken ct)
    {
        var rows = await svc.ListPublishedAsync(ct);
        return Ok(rows);
    }

    [HttpGet("{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var t = await svc.GetBySlugAsync(slug, ct);
        return t is null ? NotFound() : Ok(t);
    }

    // ── Admin list / detail / write ───────────────────────────────────────

    [HttpGet("admin")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> ListAll(CancellationToken ct)
    {
        var rows = await svc.ListAllAsync(ct);
        return Ok(rows);
    }

    [HttpGet("admin/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var t = await svc.GetByIdAsync(id, ct);
        return t is null ? NotFound() : Ok(t);
    }

    [HttpPost("admin")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Create([FromBody] CreateTournamentRequest req, CancellationToken ct)
    {
        var result = await svc.CreateAsync(req, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("admin/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTournamentRequest req, CancellationToken ct)
    {
        var result = await svc.UpdateAsync(id, req, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    public record PublishRequest(bool Publish);

    [HttpPost("admin/{id:guid}/publish")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Publish(Guid id, [FromBody] PublishRequest req, CancellationToken ct)
    {
        var result = await svc.PublishAsync(id, req.Publish, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    public record SetRegistrationRequest(bool Open);

    [HttpPost("admin/{id:guid}/registration")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetRegistration(Guid id, [FromBody] SetRegistrationRequest req, CancellationToken ct)
    {
        var result = await svc.SetRegistrationAsync(id, req.Open, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    [HttpPost("admin/{id:guid}/categories")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> UpsertCategory(Guid id, [FromBody] UpsertTournamentCategoryRequest req, CancellationToken ct)
    {
        var result = await svc.UpsertCategoryAsync(id, req, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    [HttpDelete("admin/{id:guid}/categories/{categoryId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> DeleteCategory(Guid id, Guid categoryId, CancellationToken ct)
    {
        var result = await svc.DeleteCategoryAsync(id, categoryId, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    // ── Entries: public list + register ───────────────────────────────────

    [HttpGet("{slug}/categories/{categoryId:guid}/entries")]
    [AllowAnonymous]
    public async Task<IActionResult> ListPublicEntries(string slug, Guid categoryId, CancellationToken ct)
    {
        // The slug is part of the URL for shareability; we still scope the read by categoryId.
        var rows = await entrySvc.ListPublicAsync(categoryId, ct);
        return Ok(rows);
    }

    [HttpPost("{slug}/categories/{categoryId:guid}/entries")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterEntry(
        string slug,
        Guid categoryId,
        [FromBody] RegisterTournamentEntryRequest req,
        CancellationToken ct)
    {
        Guid? uid = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsed)
            ? parsed
            : null;

        var result = await entrySvc.RegisterAsync(slug, categoryId, req, uid, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    // ── Entries: admin ─────────────────────────────────────────────────────

    [HttpGet("admin/categories/{categoryId:guid}/entries")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> ListAdminEntries(Guid categoryId, CancellationToken ct)
    {
        var rows = await entrySvc.ListForAdminAsync(categoryId, ct);
        return Ok(rows);
    }

    [HttpPut("admin/entries/{entryId:guid}/seed")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetEntrySeed(Guid entryId, [FromBody] UpdateEntrySeedRequest req, CancellationToken ct)
    {
        var result = await entrySvc.SetSeedAsync(entryId, req.Seed, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    [HttpPut("admin/entries/{entryId:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> SetEntryStatus(Guid entryId, [FromBody] UpdateEntryStatusRequest req, CancellationToken ct)
    {
        var result = await entrySvc.SetStatusAsync(entryId, req.Status, ct);
        if (!result.IsSuccess) return MapError(result.Error!.Value);
        return Ok(result.Value);
    }

    private IActionResult MapError(Epl.Domain.Common.ResultError err) => err.Code switch
    {
        "tournament_not_found"
            or "game_not_found"
            or "category_not_found"
            or "entry_not_found"        => NotFound(new { code = err.Code, message = err.Message }),
        "duplicate_slug"
            or "duplicate_format"
            or "duplicate_mobile"
            or "category_full"          => Conflict(new { code = err.Code, message = err.Message }),
        "tournament_not_published"
            or "registration_closed"    => StatusCode(StatusCodes.Status403Forbidden, new { code = err.Code, message = err.Message }),
        _                               => BadRequest(new { code = err.Code, message = err.Message }),
    };
}
