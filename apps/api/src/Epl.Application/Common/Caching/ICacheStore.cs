namespace Epl.Application.Common.Caching;

/// <summary>
/// Thin abstraction over the process-level cache. Services depend on this, not on
/// <c>Microsoft.Extensions.Caching.Memory</c> directly, so:
///   1. The Application project stays infrastructure-independent.
///   2. Swapping to <c>IDistributedCache</c> (Redis) is a one-file change in Infrastructure.
///   3. Tests get a deterministic <c>NoOpCacheStore</c> without mocking <c>IMemoryCache</c>.
/// </summary>
public interface ICacheStore
{
    /// <summary>Returns the cached value or <c>null</c> if missing.</summary>
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;

    /// <summary>
    /// Returns the cached value, populating it via <paramref name="factory"/> on miss.
    /// Stampede-protected: concurrent callers with the same key share the factory call.
    /// </summary>
    Task<T?> GetOrCreateAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T?>> factory,
        CancellationToken ct = default) where T : class;

    /// <summary>Removes a single key. Removing a missing key is a no-op (and is safe).</summary>
    void Remove(string key);

    /// <summary>
    /// Removes every tracked key whose name starts with <paramref name="prefix"/>.
    /// Use when a write touches many entries of one family (e.g. <c>tournament:</c>).
    /// </summary>
    void RemoveByPrefix(string prefix);
}
