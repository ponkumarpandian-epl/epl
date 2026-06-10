namespace Epl.Application.Common.Caching;

/// <summary>
/// Lightweight cache hit/miss counter. Cache implementations call <see cref="Hit"/> /
/// <see cref="Miss"/> per request. Production gets a real impl that bumps in-memory counters;
/// tests can ignore it.
/// </summary>
public interface ICacheMetrics
{
    void Hit(string keyFamily);
    void Miss(string keyFamily);

    /// <summary>Snapshot of current counters, keyed by family. Read-only.</summary>
    IReadOnlyDictionary<string, CacheMetricEntry> Snapshot();
}

public readonly record struct CacheMetricEntry(long Hits, long Misses)
{
    /// <summary>Hit ratio in [0, 1]. Returns 0 when no observations have been made.</summary>
    public double HitRatio => (Hits + Misses) == 0 ? 0 : (double)Hits / (Hits + Misses);
}
