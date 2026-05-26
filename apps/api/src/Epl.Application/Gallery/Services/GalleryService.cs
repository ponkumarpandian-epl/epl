using Epl.Application.Gallery.Dtos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Gallery.Services;

/// <summary>
/// Reads the gallery image list from configuration. Today the list lives in
/// appsettings under the "Gallery:Images" section; tomorrow we'll wire this
/// to Azure.Storage.Blobs to list a container's contents. The DTO contract
/// is stable so the frontend doesn't change when we swap the source.
/// </summary>
public class GalleryService(IConfiguration config, ILogger<GalleryService> log) : IGalleryService
{
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

    private sealed class GalleryImageConfig
    {
        public string?  Url      { get; init; }
        public string?  Alt      { get; init; }
        public int?     Width    { get; init; }
        public int?     Height   { get; init; }
        public string?  Category { get; init; }
    }
}
