using System.Collections.Concurrent;

namespace Epl.Application.Common.Caching;

/// <summary>
/// Process-local cache metrics. Counters are atomic <see cref="Interlocked"/> bumps per
/// "key family" — the part of the cache key before the first ":" (e.g. "season", "seasonGame").
/// Family-level aggregation keeps the cardinality bounded; per-key counts would explode.
/// </summary>
public sealed class InMemoryCacheMetrics : ICacheMetrics
{
    // Mutable counter pair stored under each family. Locks confined to write-path bumps;
    // Snapshot copies values out under a brief lock.
    private sealed class Counter { public long Hits; public long Misses; }
    private readonly ConcurrentDictionary<string, Counter> _byFamily = new();

    public void Hit(string keyFamily)
    {
        var c = _byFamily.GetOrAdd(keyFamily, _ => new Counter());
        Interlocked.Increment(ref c.Hits);
    }

    public void Miss(string keyFamily)
    {
        var c = _byFamily.GetOrAdd(keyFamily, _ => new Counter());
        Interlocked.Increment(ref c.Misses);
    }

    public IReadOnlyDictionary<string, CacheMetricEntry> Snapshot()
    {
        var snapshot = new Dictionary<string, CacheMetricEntry>(_byFamily.Count);
        foreach (var (family, counter) in _byFamily)
        {
            // Reads are not atomic with respect to concurrent bumps; accept a slight
            // skew in exchange for never blocking the hot path.
            snapshot[family] = new CacheMetricEntry(
                Hits:   Interlocked.Read(ref counter.Hits),
                Misses: Interlocked.Read(ref counter.Misses));
        }
        return snapshot;
    }
}
