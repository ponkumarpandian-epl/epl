# 13 — Read-side in-memory cache for low-volatility data

> **Status:** plan only — no code changes until approved.
> **Goal:** reduce Azure SQL query volume (and DB cost) by caching data the public pages read on every request but admins update only occasionally — Season, SeasonGame (rules + register), Game master, Apartment, and when they land, Tournament + TournamentCategory.
> **Branch context:** drafted on `feature/add-badminton-rule-cache`. Tournaments + brackets aren't on this branch yet — Phase 4 lights up after `feature/add-tournaments` merges.

---

## Why

Every public-page render today hits Azure SQL through the API for data that changes maybe a handful of times per year:

- `/rules` reads the active `Season` + per-sport `SeasonGame` rows on every visit.
- `/teams/register` reads the same `SeasonGame` for venue/format/fee/contacts.
- `/` (home) loads the active season's three sport cards.
- `/admin/*` loads master `Game` rows for picker dropdowns.

The DB is doing a lot of "give me the same row again" work. With single-instance App Service deploys (today's topology), an in-process `IMemoryCache` removes those repeats almost for free.

## Goals

1. **Cut DB queries for read-mostly resources** without changing the public-facing behavior.
2. **Keep writes authoritative** — admin updates invalidate the cache so the next read goes to the DB and warms it again.
3. **Keep it boring** — `IMemoryCache` from the framework, no new infra, no Redis until we need multi-instance.

## Core contract (this is the rule, not a guideline)

> **A write to a cached resource MUST invalidate every cache key that resource appears in, in the same service call, before the action returns to the caller. The next read after a write MUST see the fresh value.**

Three things that follow from this:

- **TTL is a safety net, not the freshness mechanism.** We pick a long TTL on purpose (8 hours — see §3.2 below) precisely so the cache stays warm; correctness comes from invalidation, not expiry.
- **Forgetting to invalidate is a bug, not a "stale-for-a-bit" UX quirk.** Every PR that adds a write path to a cached resource has to add the matching `cache.Remove(...)` call. Code review checklist item.
- **No "eventual" consistency.** This isn't a CDN where 60 seconds of staleness is fine. Admin edits the venue → next visitor to the page sees the new venue.

## Non-goals

- No CDN / browser cache changes.
- No frontend ISR / `unstable_cache` changes — the React `cache()` per-request memoisation in `apps/web/src/lib/*` is already in place and complements this.
- No write-side caching (we never cache mutation responses; reads regenerate on next call).
- No distributed cache. Worth knowing the migration path exists (`IDistributedCache` is the same interface), but YAGNI today.

---

## 1. Scope — what to cache

### Cache (high read, low write)

**Default TTL: 8 hours.** Long on purpose. The whole point is to stay warm through a typical admin's working day. Freshness comes from §Core contract invalidation, never from waiting for expiry.

| Resource | Key | TTL | Read paths today |
|---|---|---|---|
| Active `Season` | `season:active` | 8 h | `/`, `/rules`, `/teams/register`, every admin page header |
| `Season` by id | `season:{id}` | 8 h | `/admin/seasons/[id]` |
| All `Game` master rows | `games:all` | 8 h | Admin pickers, sport-slug lookups |
| `SeasonGame` by id | `seasonGame:{id}` | 8 h | `/admin/seasons/[id]`, admin edit forms |
| `SeasonGame` by (seasonId, sport) | `seasonGame:{seasonId}:{sport}` | 8 h | `/rules?sport=cricket`, `/teams/register?sport=…` |
| `Apartment` list | `apartments:all` | 8 h | Team registration apartment picker |
| **(future)** `Tournament` by id / slug | `tournament:{id}` · `tournament:slug:{slug}` | 8 h | `/tournaments/[slug]`, admin edit |
| **(future)** `TournamentCategory` list for a tournament | embedded in tournament dto | — | same |
| **(future)** Published tournament list | `tournament:published-list` | 8 h | `/tournaments` hub |

**Why uniform 8 hours and not per-resource tuning:** less to remember, fewer config knobs to get wrong, and per-resource TTL tuning only matters if invalidation is unreliable — and §Core contract says it can't be. If the active season really does need to be cached for 24 hours, we can bump that single key later. Until then, uniform default wins.

### Don't cache (high write or correctness-critical)

| Resource | Why |
|---|---|
| `Team`, `TeamMember` | New registrations land continuously — counters drift |
| `TournamentEntry` (future) | Same — entry counts feed UI gating |
| `Match` / `Bracket` (future) | Live scoring will mutate per point |
| `UserGameSkill`, profile | Players edit profile any time |
| Any `Count*` query feeding capacity/cap logic | Must be authoritative |
| Anything behind `IsLive` / `Status == InProgress` | Real-time semantics |

If a future feature wants to cache a fast-changing resource, the call has to come with an explicit invalidation story and short TTL — not a blanket "let's cache it."

---

## 2. Where the cache lives

**Backend (.NET API), `IMemoryCache`.**

Rationale:
- Single API instance today (`epl-sports-api` Windows App Service) — no coherence issue.
- `Microsoft.Extensions.Caching.Memory` ships with ASP.NET Core.
- One layer to invalidate from (the service that owns the write).
- Targets the real cost driver — Azure SQL DTU.

Why not the frontend:
- React `cache()` already memoises within a single SSR pass.
- Next.js `unstable_cache` would help across requests but only on the web tier; the API still hammers SQL on cache-miss for every web instance. Backend cache is strictly better leverage.

Migration path (when we go multi-instance):
- Swap `services.AddMemoryCache()` for `services.AddStackExchangeRedisCache(...)`.
- Keep the same `IDistributedCache` interface — no code changes outside DI.
- Defer until topology actually demands it (i.e., when we add a second App Service slot).

---

## 3. Design

### 3.1 The cache abstraction

Introduce a thin `ICacheStore` wrapper in `Epl.Application/Common/Caching/`:

```csharp
public interface ICacheStore
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;
    Task<T>  GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct = default) where T : class;
    void     Remove(string key);
    void     RemoveByPrefix(string prefix); // for "everything under tournament:slug:*"
}
```

Why a wrapper rather than `IMemoryCache` directly:
- Lets services depend on something simple + mockable, without dragging `Microsoft.Extensions.Caching.Memory` into the Application project.
- Centralises the lock for cache stampede (per-key `SemaphoreSlim`, see §3.4).
- Swapping the impl to Redis later is a one-file change.

Two implementations:
- `MemoryCacheStore` — production, wraps `IMemoryCache`.
- `NoOpCacheStore` — registered in tests so each test sees a fresh DB.

### 3.2 Key naming

- Lowercase, colon-separated, scoped by resource: `season:active`, `seasonGame:{id}`, `tournament:slug:{slug}`.
- One namespace per resource family so prefix-based invalidation is possible.
- Include the discriminator (`{id}`, `{slug}`) when more than one row of the same kind can be cached.

### 3.3 Where the cache-aware code lives

**Service-level, not repository-level.** Services already know about cache-relevant orchestration (writes that should invalidate). Repositories should stay dumb about caching.

Sketch (using `SeasonService` as the canonical example):

```csharp
public class SeasonService(IUnitOfWork uow, ICacheStore cache, ILogger<SeasonService> log) : ISeasonService
{
    private const string ActiveKey = "season:active";
    // 8h default TTL applied centrally — defined once on ICacheStore as
    // CacheTtl.Default. Don't sprinkle TimeSpans through services.
    public Task<SeasonDto?> GetActiveAsync(CancellationToken ct = default)
        => cache.GetOrCreateAsync(ActiveKey, CacheTtl.Default, async _ =>
        {
            var s = await uow.Seasons.GetActiveAsync(ct);
            return s is null ? null : ToDto(s);
        }, ct);

    public async Task<Result<SeasonDto>> UpdateAsync(Guid id, UpdateSeasonRequest req, CancellationToken ct = default)
    {
        // ... existing logic ...
        await uow.SaveChangesAsync(ct);

        // ── INVALIDATION: every key this row participates in, before we return. ──
        // Removing a non-existent key is a no-op, so over-invalidating is safe.
        // Under-invalidating is a correctness bug — see §Core contract.
        cache.Remove(ActiveKey);
        cache.Remove($"season:{id}");
        log.LogInformation("Cache invalidated for season {Id}", id);

        return Result<SeasonDto>.Ok(ToDto(s));
    }
}

// Epl.Application/Common/Caching/CacheTtl.cs
public static class CacheTtl
{
    /// <summary>Default safety-net TTL. Freshness comes from explicit invalidation, not expiry.</summary>
    public static readonly TimeSpan Default = TimeSpan.FromHours(8);
}
```

Alternatives considered:
- **Decorator repos (`CachedSeasonRepository : ISeasonRepository`)**: cleaner separation, but invalidation now happens at the wrong layer (repo doesn't know it just got mutated through a different repo). Service-level is more honest.
- **AOP / source generator**: overkill for ~10 cache-aware methods.

### 3.4 Cache stampede protection

When the cache expires, 100 concurrent requests can all see "miss" and hammer the DB simultaneously. `MemoryCacheStore.GetOrCreateAsync` will use a per-key `SemaphoreSlim` (held in a `ConcurrentDictionary<string, SemaphoreSlim>`) so only one factory runs at a time per key.

Alternative: use the `LazyCache` NuGet package, which provides this out of the box. ~50KB dep. **Recommendation:** start with the hand-rolled lock; the surface area we need is small. Pull in LazyCache only if we end up rebuilding more of it.

---

## 4. Invalidation matrix

This is the contract from §Core contract, made concrete. Every write path that touches a cached resource MUST remove the listed keys, in the same service method, before returning. The next read sees fresh data — period.

| Write action | Keys to invalidate | Notes |
|---|---|---|
| `Season.Update` | `season:active`, `season:{id}` | Both keys — caller may have hit either |
| `Season.Activate(id)` (sets active flag) | `season:active`, `season:{newActiveId}`, `season:{previousActiveId}` | The previous active row's flags also changed |
| `SeasonGame.Update(id)` | `seasonGame:{id}`, `seasonGame:{seasonId}:{sport}` | Cover both lookup paths |
| `SeasonGame.ToggleRegistration(id)` | same | |
| `SeasonGame.UpdateContacts / UpdateRules / UpdateFacts` (any field) | same | If it lives on the row, treat it the same |
| `Game.Update(id)` (very rare) | `games:all` | Master rows; one key family |
| `Apartment.AddOrUpdate(id)` (rare) | `apartments:all` | Single key |
| `Tournament.Create / Update / PublishToggle / SetRegistration` (future) | `tournament:{id}`, `tournament:slug:{slug}`, `tournament:published-list` | List key too — publish flips list membership |
| `TournamentCategory.Upsert / Delete` (future) | `tournament:{tournamentId}`, `tournament:slug:{slug}` | Categories embed in tournament dto |

Two operating rules that make this tractable:

1. **Over-invalidate when uncertain.** Removing a non-existent key is a no-op. The keys are cheap to recompute. If a write touches data that *might* feed a cached DTO somewhere, drop the keys.
2. **When the write touches an entire family, use the prefix sweep.** `cache.RemoveByPrefix("tournament:")` clears every tournament-keyed entry in one call. Cheaper to reason about than itemising 6 keys.

What "before the action returns" means in code:

```csharp
public async Task<Result<...>> UpdateAsync(...)
{
    // ... mutate the entity ...
    await uow.SaveChangesAsync(ct);   // (1) DB committed
    cache.Remove(KeyA);               // (2) cache invalidated
    cache.Remove(KeyB);               //     "       "
    return Result.Ok(...);            // (3) caller gets success — next read sees fresh data
}
```

Reverse the order (return-then-invalidate) and you create a window where a concurrent reader sees stale data after a successful write. That's the bug the contract prevents.

---

## 5. Phases

Ship one phase at a time. Each is independently shippable and reversible (delete the cache call → falls back to the existing DB path).

### Phase 1 — Foundation + the smallest, safest target (Season + Game master)

1. Add `Microsoft.Extensions.Caching.Memory` package (already a transitive dep of `Microsoft.AspNetCore.App` but be explicit).
2. Add `ICacheStore` + `MemoryCacheStore` + `NoOpCacheStore` in `Epl.Application/Common/Caching/`.
3. Register `services.AddMemoryCache()` + `services.AddSingleton<ICacheStore, MemoryCacheStore>()` in `Epl.Application.DependencyInjection`.
4. Cache `SeasonService.GetActiveAsync` (huge read leverage; changes ~once a year).
5. Cache `GameService.ListAllAsync` (effectively immutable).
6. Invalidate on `SeasonService.Update / Activate`.

**Files touched:** ~5. **Risk:** very low.

### Phase 2 — SeasonGame (rules + register pages, the user's stated targets)

1. Cache `SeasonGameService.GetByIdAsync` and `GetBySeasonAndSportAsync`.
2. Invalidate on `Update / ToggleRegistration / UpdateContacts / UpdateRules`.
3. Read-flow check: confirm `/rules` and `/teams/register` actually hit these cached methods (not raw repo calls bypassing the service).

**Files touched:** ~3-4 (service + DI is already done). **Risk:** low.

### Phase 3 — Apartment lookup

1. Cache `ApartmentService.ListAllAsync` with 60-min TTL.
2. Add invalidation hooks on the (rare) admin apartment-edit path. If no admin UI exists yet, defer until it does.

**Files touched:** ~2. **Risk:** very low.

### Phase 4 — Tournaments + categories (once `feature/add-tournaments` merges to `main`)

1. Cache `TournamentService.GetBySlugAsync`, `GetByIdAsync`, `ListPublishedAsync`.
2. Invalidate on `CreateAsync / UpdateAsync / PublishAsync / SetRegistrationAsync / UpsertCategoryAsync / DeleteCategoryAsync`.
3. **Do NOT** cache entry counts inside the tournament DTO — those should keep coming from `TournamentEntries.CountByTournamentAsync` on every read.

**Files touched:** ~3. **Risk:** moderate (categories embed in tournament dto, multiple write paths must invalidate).

### Phase 5 (optional) — Observability

Add a small `CacheMetrics` class that increments hit/miss counters per key family. Log a 5-minute rollup so we can see the actual hit ratio. If hit ratio is below 80% for a key family, we're caching the wrong thing.

---

## 6. Operational concerns

### 6.1 Multi-instance

When EPL outgrows a single API instance, in-memory cache stops being coherent (each instance has its own copy; invalidation only hits the instance that handled the write). Migration path:
- Replace `MemoryCacheStore` with a `RedisCacheStore` that wraps `IDistributedCache`.
- Use Azure Cache for Redis Basic tier (cheapest).
- No service-layer changes — the abstraction holds.

Tracked here as a known limit; not implementing now.

### 6.2 Testing

- `Tests` project (when we have one) registers `NoOpCacheStore`. Every read hits the DB. No stale-state surprises.
- Integration tests for invalidation: write a row, read, mutate, read again, assert the second read reflects the change. One test per cached key family is enough.

### 6.3 Memory ceiling

`MemoryCacheOptions.SizeLimit` — set a safety bound (say 50 MB worth of entries) so a key explosion can't OOM the App Service. Each cache entry's `Size` is set to a rough estimate; eviction is LRU when the cap is hit.

### 6.4 Cache warming

Optional: on app start, prefetch `season:active` + `games:all` so the very first request after a deploy doesn't pay the cold cost. ~10 lines in `Program.cs` post-`Build()`. Defer until measured.

### 6.5 Cache poisoning

Never cache a DTO derived from data that's not in this DB (e.g., a `/api/auth/me` response). Caching is keyed by domain state only.

---

## 7. Frontend implications

Mostly none. The frontend already uses React `cache()` for per-request dedupe in `apps/web/src/lib/*`. That layer + this backend cache compose cleanly:

- A single SSR pass that reads `getActiveSeason()` 3 times → React `cache()` reduces it to 1 backend call → backend cache reduces it to 1 DB call (or 0 if warm).

No need to touch `lib/api.ts` or any of the fetchers.

One thing to be aware of: when an admin makes a write via a server action, the frontend already calls `revalidatePath(...)` to invalidate Next's data cache for that route. That's a separate concern from the backend cache and continues to work as-is.

---

## 8. Open questions / decisions before iteration starts

| # | Question | Decision |
|---|---|---|
| Q1 | Hand-roll the per-key lock for stampede protection, or pull in `LazyCache`? | Hand-roll for now; revisit if we need more cache features. |
| Q2 | ~~Default TTL?~~ | **8 hours uniform** (decided). Long-on-purpose; freshness is invalidation-driven. |
| Q3 | Should we add a `/api/admin/cache/clear` endpoint for emergencies? | Yes, gated by `AdminOnly`. Cheap to add. |
| Q4 | Phase order — start with Season/Game (lowest risk) or jump to SeasonGame (highest user impact)? | Foundation + Season/Game first (Phase 1), then SeasonGame (Phase 2). Foundation is reusable; Phase 2 builds on it directly. |
| Q5 | Do we cache the `TournamentSummaryDto` list, or just the detail? Lists invalidate on any tournament write. | Both. Lists win on the public hub; the invalidation surface is the same. |

---

## 9. What "done" looks like

- DB query rate on `/rules`, `/teams/register`, `/`, `/admin/*` drops by a measurable amount (target: ≥70% reduction on warm cache).
- Admin writes still produce a correct result on the next read (invalidation works).
- No new failure modes — if the cache is bypassed (e.g. `NoOpCacheStore` in tests), the app behaves identically.
- A short paragraph in `04-backend.md` documents the cache layer for future contributors.

---

## 10. Out of scope (for this plan)

- Distributed cache (Redis) — deferred to the multi-instance world.
- HTTP response caching headers — separate concern, separate plan.
- Caching of computed counts (entries, teams, etc.) — those need a different correctness story.
- Caching frontend asset responses — already handled by Next.js / CDN at the edge.
