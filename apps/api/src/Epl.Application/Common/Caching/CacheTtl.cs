namespace Epl.Application.Common.Caching;

/// <summary>
/// Centralised TTL constants. Cache entries default to <see cref="Default"/> — long-on-purpose
/// because freshness comes from explicit invalidation on write paths, not from expiry.
/// See <c>plan/13-readside-inmemory-cache.md</c> §Core contract.
/// </summary>
public static class CacheTtl
{
    /// <summary>
    /// Default safety-net TTL applied to all read-side cache entries.
    /// 8 hours — covers a typical admin's working day with one warm cache.
    /// </summary>
    public static readonly TimeSpan Default = TimeSpan.FromHours(8);
}
