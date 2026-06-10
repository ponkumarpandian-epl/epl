using Epl.Application.Authorization;
using Epl.Application.Common.Caching;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Epl.Api.Controllers;

/// <summary>
/// Admin-only observability + control for the process-level read cache.
///
/// <c>GET /api/admin/cache/stats</c>  — hit/miss snapshot per key family.
/// <c>POST /api/admin/cache/clear</c> — drop all cached entries. Use as an emergency hammer
///                                     when an invalidation bug ships and you need to flush
///                                     without restarting the app.
/// </summary>
[ApiController]
[Route("api/admin/cache")]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public class AdminCacheController(ICacheMetrics metrics, ICacheStore cache) : ControllerBase
{
    public record CacheFamilyStat(string Family, long Hits, long Misses, double HitRatio);

    [HttpGet("stats")]
    public IActionResult GetStats()
    {
        var rows = metrics.Snapshot()
            .Select(kv => new CacheFamilyStat(kv.Key, kv.Value.Hits, kv.Value.Misses, kv.Value.HitRatio))
            .OrderBy(r => r.Family)
            .ToList();
        return Ok(rows);
    }

    /// <summary>Drops every cached entry. Cheap — the next reader re-fills from DB.</summary>
    [HttpPost("clear")]
    public IActionResult Clear()
    {
        // Empty prefix matches every tracked key.
        cache.RemoveByPrefix(string.Empty);
        return Ok(new { cleared = true });
    }
}
