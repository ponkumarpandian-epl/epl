---
name: cache-readside-patterns
description: "Apply the project's in-memory read-side cache pattern to NEW backend features. Use whenever you add a service method that returns Season/Game/SeasonGame/Tournament/Apartment data, or any read-mostly low-volatility resource. Also use whenever you add a write path that mutates a cached resource. Trigger words: 'cache', 'caching', 'DB hit', 'reduce queries', 'read-side', 'invalidate', 'IMemoryCache', 'ICacheStore', 'low-volatility', 'lookup', 'master data', 'public read endpoint', 'admin update', and any new ASP.NET Core controller endpoint that exposes data the public pages read repeatedly. The pattern is defined in plan/13-readside-inmemory-cache.md and implemented in Epl.Application.Common.Caching + Epl.Infrastructure.Caching. Use this skill BEFORE writing service-layer reads/writes for any new feature."
---

# Cache Read-Side Patterns — EPL backend

A binding pattern for adding read-side caching to **new backend services**. Apply it whenever you write:

1. A service method that **reads data the public pages display** and that doesn't change minute-to-minute.
2. A service method that **writes** a resource which is (or could be) cached.

The full design lives in [`plan/13-readside-inmemory-cache.md`](../../../plan/13-readside-inmemory-cache.md). This skill is the **operational checklist** — short, tactical, and meant to keep every new feature consistent with the existing implementation.

---

## The contract — non-negotiable

> **A write to a cached resource MUST invalidate every key that resource appears in, in the same service method, before the action returns. The next read MUST see the fresh value.**

TTL is **8 hours** (long, on purpose). Freshness comes from invalidation, not expiry. Forgetting an invalidation is a bug, not a "stale-for-a-bit" UX quirk.

---

## When to apply

| Situation | Apply? |
|---|---|
| New `GET` service method returning a resource that changes rarely (Season, Game, SeasonGame, Tournament, Category, Apartment, BracketView, GameRules) | ✅ Yes — cache it |
| Same method but the resource embeds live counters (`teamCount`, `totalEntries`, match scores) | ⚠️ Cache the resource WITHOUT the counters, or skip caching entirely if counters dominate the DTO |
| New `POST` / `PUT` / `DELETE` service method that mutates a cached resource | ✅ Yes — invalidate after `SaveChangesAsync`, before returning |
| Method on `TeamService.CreateAsync` / `TournamentEntryService.RegisterAsync` (high-write, count-mutating) | ❌ Don't cache the write. But DO invalidate any cached aggregate / count DTO the write affects |
| Read returns `MatchStatus.InProgress` data, live scores, or anything time-sensitive | ❌ Don't cache |
| Auth / user-specific reads (`/api/auth/me`, profile by current user) | ❌ Don't cache. Caching user-scoped data without per-user keys leaks PII |

---

## The read pattern (drop-in template)

```csharp
using Epl.Application.Common.Caching;

public class XService(IUnitOfWork uow, ICacheStore cache, ILogger<XService> log) : IXService
{
    public Task<XDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => cache.GetOrCreateAsync(CacheKeys.XById(id), CacheTtl.Default, async token =>
        {
            var x = await uow.X.GetAsync(id, token);
            return x is null ? null : ToDto(x);
        }, ct);
}
```

Rules for the read pattern:

1. **Always `CacheTtl.Default`** unless you have a specific reason. Don't sprinkle `TimeSpan.FromMinutes(N)` through the codebase.
2. **Always `CacheKeys.SomethingName(args)`** — define the key in `Epl.Application.Common.Caching.CacheKeys.cs`. Never use string literals at the call site.
3. **Pass `token`** (not `ct`) into the factory — `GetOrCreateAsync` provides the cancellation token through the lambda.
4. **Return type matches the cache type.** If the method returns `IReadOnlyList<T>`, cache `IReadOnlyList<T>` — don't unwrap and re-wrap.

---

## The write pattern (drop-in template)

```csharp
public async Task<Result<XDto>> UpdateAsync(Guid id, UpdateXRequest req, CancellationToken ct = default)
{
    var x = await uow.X.GetAsync(id, ct);
    if (x is null) return Result<XDto>.Fail("x_not_found", "X not found.");

    // ... mutate fields ...
    await uow.SaveChangesAsync(ct);                              // (1) DB committed

    // (2) INVALIDATE: every key this resource appears in.
    cache.Remove(CacheKeys.XById(id));
    cache.Remove(CacheKeys.XListAll);          // if the row appears in a list cache
    // For families with many related keys, use the prefix sweep:
    // cache.RemoveByPrefix(CacheKeys.XFamilyPrefix);

    log.LogInformation("Updated X {Id}, cache invalidated", id);
    return Result<XDto>.Ok(ToDto(x));                            // (3) caller proceeds
}
```

Order matters: **DB save → invalidate → return**. Reversing 2 and 3 opens a stale-read window where a concurrent reader sees old data after a successful write returned.

---

## Adding a new key family

When introducing a new cacheable resource:

1. **Add the keys** to `Epl.Application/Common/Caching/CacheKeys.cs`:
   ```csharp
   public const string XListAll              = "x:all";
   public static string XById(Guid id)       => $"x:{id}";
   public static string XBySlug(string slug) => $"x:slug:{slug}";
   public const string XFamilyPrefix         = "x:";
   ```

2. **Naming rules**:
   - Lowercase, colon-separated.
   - First segment = family (`x`, `season`, `tournament`).
   - Family must match the prefix constant.
   - Discriminators after the family (`x:{id}`, `x:slug:{slug}`).

3. **Don't** invent new TTL constants. Reuse `CacheTtl.Default`.

---

## Invalidation matrix — write it out before coding

Before adding caching to a new feature, fill in this table for the resource. Every row maps a write path to the keys it touches. Forgetting a row = a stale-data bug ships.

| Write action | Keys to invalidate | Why |
|---|---|---|
| `Create(SetActive=true)` | `RemoveByPrefix(XFamilyPrefix)` | Flag change ripples to peer rows |
| `Update(id)` | `XById(id)`, `XListAll` | Row content + list embed |
| `Delete(id)` | `XById(id)`, `XListAll` | Same |
| `ToggleFlag(id)` | `XById(id)`, `XListAll` | Same |

Two operating principles that make this tractable:

- **Over-invalidate when uncertain.** Removing a missing key is a no-op. Keys are cheap to recompute.
- **Prefer `RemoveByPrefix(family)` over itemising 5+ keys** when a write could touch many entries in one family.

---

## Existing reference implementations to read first

| File | What it shows |
|---|---|
| [`Epl.Application/Common/Caching/ICacheStore.cs`](../../../apps/api/src/Epl.Application/Common/Caching/ICacheStore.cs) | The abstraction. Methods: `GetAsync`, `GetOrCreateAsync`, `Remove`, `RemoveByPrefix` |
| [`Epl.Application/Common/Caching/CacheKeys.cs`](../../../apps/api/src/Epl.Application/Common/Caching/CacheKeys.cs) | Where to add new keys |
| [`Epl.Application/Seasons/Services/SeasonService.cs`](../../../apps/api/src/Epl.Application/Seasons/Services/SeasonService.cs) | Canonical example — every method shows the pattern in context |
| [`Epl.Infrastructure/Caching/MemoryCacheStore.cs`](../../../apps/api/src/Epl.Infrastructure/Caching/MemoryCacheStore.cs) | The impl. You shouldn't need to edit this; if you do, you're probably solving the wrong problem |

---

## Checklist for code review

When reviewing a PR that adds a new read endpoint or mutating method, check:

- [ ] Every read in the new service is wrapped in `cache.GetOrCreateAsync(...)` unless it's explicitly a hot-data path (counts, live state, user-scoped).
- [ ] Every write calls `cache.Remove(...)` or `cache.RemoveByPrefix(...)` AFTER `SaveChangesAsync` and BEFORE the `return`.
- [ ] Keys come from `CacheKeys.*`, never string literals.
- [ ] TTL is `CacheTtl.Default`. No `TimeSpan.FromMinutes(...)` at call sites.
- [ ] If the resource embeds counts (`totalEntries`, `teamCount`), the count comes from a separate **uncached** query — counts must stay authoritative.
- [ ] An invalidation matrix is sketched in the PR description (or as a code comment in the service) so reviewers can verify every write path.
- [ ] Log additions follow the existing convention: Debug for hit/miss in `MemoryCacheStore`; Information for invalidation events.

---

## Anti-patterns — reject these in review

| Bad | Why | Right thing |
|---|---|---|
| `cache.GetOrCreateAsync(key, TimeSpan.FromMinutes(10), ...)` | Bypasses centralized TTL; future tuning becomes a grep-and-pray | `CacheTtl.Default` |
| `cache.GetOrCreateAsync($"tournament:{id}", ...)` | String literal key — invalidator can't find it later | `CacheKeys.TournamentById(id)` |
| Cache wrapped inside a repository | Repositories must stay dumb. The write that needs to invalidate happens at the service layer; cache lives where the orchestration lives | Service layer |
| `cache.Remove(...)` at the start of a write method | Invalidates a key that the DB hasn't actually updated yet — concurrent reader can repopulate stale data before `SaveChangesAsync` lands | Invalidate after `SaveChangesAsync`, before `return` |
| Caching a DTO whose `TotalEntries` / `ConfirmedEntries` is a live count | Stale counter → broken capacity gating, wrong UI states | Cache the immutable part; fetch counts on every read |
| `IMemoryCache` injected directly into a service | Couples the Application project to the cache impl; breaks `NoOpCacheStore` in tests | `ICacheStore` always |

---

## Multi-instance heads-up

The current `MemoryCacheStore` is process-local. As long as the API runs on **one** App Service instance, invalidation works correctly. When the App Service Plan ever goes >1 instance, the cache becomes incoherent (writes hit one instance's cache, others keep stale data until the 8h TTL).

Migration when it's needed: swap `MemoryCacheStore` for a `RedisCacheStore` wrapping `IDistributedCache`. One file changed in `Epl.Infrastructure.DependencyInjection`. The service layer doesn't change at all — that's why the `ICacheStore` abstraction exists.

If a new feature you're adding seems to *need* multi-instance coherence right now (e.g. a webhook that mutates data and the response is served by a different instance), flag it — the answer is probably Redis, but the trigger to migrate is "we're scaling out", not "this one feature would benefit."

---

## TL;DR for the impatient

1. New read of low-volatility data → wrap in `cache.GetOrCreateAsync(CacheKeys.XById(id), CacheTtl.Default, factory)`.
2. New write to that data → `cache.Remove(CacheKeys.XById(id))` (and any list/prefix keys it appears in) after `SaveChangesAsync`, before `return`.
3. All keys live in `CacheKeys.cs`. Add yours there.
4. Don't cache live counts. Don't cache per-user data. Don't cache mid-match state.
5. Read [`SeasonService.cs`](../../../apps/api/src/Epl.Application/Seasons/Services/SeasonService.cs) once — it's the reference implementation.
