using Epl.Application.Common.Caching;
using Epl.Application.Gallery.Dtos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Gallery.Services;

/// <summary>
/// Serves the legacy configured gallery and the dynamically discovered
/// Season 2 game-day gallery through one stable DTO contract.
/// </summary>
public class GalleryService(
    IConfiguration config,
    IGameGallerySource gameGallerySource,
    ICacheStore cache,
    ILogger<GalleryService> log) : IGalleryService
{
    private const string Season2GamesCacheKey = "gallery:season2:games";

    public Task<GalleryResponse> ListAsync(CancellationToken ct = default)
    {
        var section = config.GetSection("Gallery:Images");
        var items = section.Get<List<GalleryImageConfig>>() ?? new();

        var dtos = items
            .Where(i => !string.IsNullOrWhiteSpace(i.Url))
            .Select(i => new GalleryImage(
                Url:      i.Url!,
                Alt:      i.Alt ?? string.Empty,
                Width:    i.Width,
                Height:   i.Height,
                Category: i.Category))
            .ToList();

        log.LogInformation("Gallery serving {Count} images from configuration", dtos.Count);

        return Task.FromResult(new GalleryResponse(dtos, dtos.Count, DateTimeOffset.UtcNow));
    }

    public async Task<GalleryResponse> ListSeason2GamesAsync(CancellationToken ct = default)
    {
        var cacheMinutes = Math.Max(1, config.GetValue("GameGallery:CacheMinutes", 15));
        var response = await cache.GetOrCreateAsync(
            Season2GamesCacheKey,
            TimeSpan.FromMinutes(cacheMinutes),
            async token =>
            {
                var items = await gameGallerySource.ListSeason2Async(token);
                log.LogInformation(
                    "Season 2 game gallery loaded {Count} images from blob storage",
                    items.Count);
                return new GalleryResponse(items, items.Count, DateTimeOffset.UtcNow);
            },
            ct);

        return response ?? new GalleryResponse([], 0, DateTimeOffset.UtcNow);
    }

    private sealed class GalleryImageConfig
    {
        public string?  Url      { get; init; }
        public string?  Alt      { get; init; }
        public int?     Width    { get; init; }
        public int?     Height   { get; init; }
        public string?  Category { get; init; }
    }
}
