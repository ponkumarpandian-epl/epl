using System.Collections.Concurrent;
using System.Diagnostics;
using Epl.Application.Common.Caching;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Epl.Infrastructure.Caching;

/// <summary>
/// <see cref="ICacheStore"/> backed by <see cref="IMemoryCache"/>.
///
/// Notes:
///  - Stampede protection: concurrent <see cref="GetOrCreateAsync"/> calls for the same key
///    share one factory invocation, gated by a per-key <see cref="SemaphoreSlim"/>.
///  - Key tracking: we mirror live keys in <see cref="_knownKeys"/> so <see cref="RemoveByPrefix"/>
///    can scan them. The set is a slight overestimate (TTL-evicted keys linger until next
///    access), but never under-reports — safe for invalidation.
///  - Metrics: hits/misses bumped per "family" (the segment before the first ':').
///  - Logging:
///       * Debug — per-call hit/miss/factory-elapsed so dev can confirm whether a page hit
///         the cache or the DB. Enable by setting Serilog override
///         "Epl.Infrastructure.Caching": "Debug" (already on in appsettings.Development.json).
///       * Information — invalidation events (Remove / RemoveByPrefix), low-volume + worth
///         seeing in prod logs.
/// </summary>
public sealed class MemoryCacheStore(
    IMemoryCache cache,
    ICacheMetrics metrics,
    ILogger<MemoryCacheStore> log) : ICacheStore
{
    private readonly IMemoryCache _cache    = cache;
    private readonly ICacheMetrics _metrics = metrics;
    private readonly ILogger<MemoryCacheStore> _log = log;

    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks    = new();
    private readonly ConcurrentDictionary<string, byte>           _knownKeys = new();

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class
    {
        if (TryReadCached<T>(key, out var typed))
        {
            _metrics.Hit(KeyFamily(key));
            _log.LogDebug("cache HIT  {Key}", key);
            return Task.FromResult(typed);
        }
        _metrics.Miss(KeyFamily(key));
        _log.LogDebug("cache MISS {Key} (peek only, no factory)", key);
        return Task.FromResult<T?>(null);
    }

    public async Task<T?> GetOrCreateAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T?>> factory,
        CancellationToken ct = default) where T : class
    {
        // Hot path: most calls land here without ever touching the lock.
        if (TryReadCached<T>(key, out var cached))
        {
            _metrics.Hit(KeyFamily(key));
            _log.LogDebug("cache HIT  {Key}", key);
            return cached;
        }

        var gate = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            // Double-check after acquiring the lock — a concurrent caller may have populated.
            if (TryReadCached<T>(key, out cached))
            {
                _metrics.Hit(KeyFamily(key));
                _log.LogDebug("cache HIT  {Key} (after lock — populated by concurrent caller)", key);
                return cached;
            }

            _metrics.Miss(KeyFamily(key));
            // Measure the underlying load — useful to spot slow DB queries the cache is hiding.
            var sw = Stopwatch.StartNew();
            var value = await factory(ct).ConfigureAwait(false);
            _log.LogDebug("cache MISS {Key} → source loaded in {ElapsedMs}ms", key, sw.ElapsedMilliseconds);

            // Cache nulls too — prevents "miss every time" for keys whose authoritative answer
            // is "row doesn't exist". Use a sentinel so TryGetValue still distinguishes hit-null
            // from absent.
            _cache.Set(
                key,
                (object?)value ?? NullSentinel,
                new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
            _knownKeys.TryAdd(key, 0);

            return value;
        }
        finally
        {
            gate.Release();
        }
    }

    public void Remove(string key)
    {
        var wasPresent = _knownKeys.TryRemove(key, out _);
        _cache.Remove(key);
        // Don't dispose the SemaphoreSlim — a concurrent reader may still hold it. Let GC handle.
        _locks.TryRemove(key, out _);
        if (wasPresent) _log.LogInformation("cache CLEAR {Key}", key);
    }

    public void RemoveByPrefix(string prefix)
    {
        // Snapshot the keys to avoid mutating-during-iteration on the concurrent dictionary.
        var keys = _knownKeys.Keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal)).ToArray();
        foreach (var key in keys) Remove(key);
        if (keys.Length > 0)
            _log.LogInformation("cache CLEAR prefix={Prefix} count={Count}", prefix, keys.Length);
    }

    // The "family" for metrics is the prefix before the first ":" — "season:active" → "season".
    // Caps cardinality at ~6-8 families across the app vs hundreds of distinct keys.
    private static string KeyFamily(string key)
    {
        var i = key.IndexOf(':');
        return i < 0 ? key : key[..i];
    }

    /// <summary>
    /// Resolves a raw cache entry into a typed value, distinguishing three states:
    ///   - present + matches T → returns true with the typed value
    ///   - present + NullSentinel → returns true with null (cached miss)
    ///   - absent or wrong type → returns false (cache miss)
    /// Keeping this in one place prevents the "cached null becomes perpetual miss" footgun.
    /// </summary>
    private bool TryReadCached<T>(string key, out T? value) where T : class
    {
        if (_cache.TryGetValue(key, out var raw))
        {
            if (ReferenceEquals(raw, NullSentinel))
            {
                value = null;
                return true;
            }
            if (raw is T typed)
            {
                value = typed;
                return true;
            }
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Sentinel object stored in the cache to represent "the factory returned null".
    /// Distinct from <c>IMemoryCache.TryGetValue</c>'s absent-key signal so we can cache misses.
    /// </summary>
    private static readonly object NullSentinel = new();
}
