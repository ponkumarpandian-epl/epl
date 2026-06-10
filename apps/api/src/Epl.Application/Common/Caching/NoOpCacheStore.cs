namespace Epl.Application.Common.Caching;

/// <summary>
/// Cache that never caches. Every <c>GetOrCreateAsync</c> hits the factory; every <c>Get</c>
/// returns <c>null</c>. Wire this in tests so each test sees a fresh DB state without having
/// to know about cache keys or invalidation order.
/// </summary>
public sealed class NoOpCacheStore : ICacheStore
{
    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class
        => Task.FromResult<T?>(null);

    public Task<T?> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T?>> factory, CancellationToken ct = default) where T : class
        => factory(ct);

    public void Remove(string key) { }
    public void RemoveByPrefix(string prefix) { }
}
