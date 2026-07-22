using System.Globalization;
using System.Diagnostics;
using System.Text.RegularExpressions;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Epl.Application.Gallery.Dtos;
using Epl.Application.Gallery.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Epl.Infrastructure.Storage;

internal sealed partial class AzureGameGallerySource(
    BlobServiceClient blobServiceClient,
    IOptions<GameGalleryOptions> options,
    ILogger<AzureGameGallerySource> log) : IGameGallerySource
{
    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".avif" };

    public async Task<IReadOnlyList<GalleryImage>> ListSeason2Async(CancellationToken ct = default)
    {
        var refreshTimer = Stopwatch.StartNew();
        var settings = options.Value;
        var container = blobServiceClient.GetBlobContainerClient(settings.Container);
        var candidates = new List<Candidate>();

        foreach (var configuredPrefix in settings.Prefixes.Where(p => !string.IsNullOrWhiteSpace(p)))
        {
            var prefix = NormalisePrefix(configuredPrefix);
            var category = ToCategory(prefix);
            var countBeforePrefix = candidates.Count;

            try
            {
                await foreach (var blob in container.GetBlobsAsync(
                    traits: BlobTraits.Metadata,
                    states: BlobStates.None,
                    prefix: prefix,
                    cancellationToken: ct))
                {
                    if (!AllowedExtensions.Contains(Path.GetExtension(blob.Name))) continue;

                    var alt = blob.Metadata.TryGetValue("alt", out var metadataAlt)
                        && !string.IsNullOrWhiteSpace(metadataAlt)
                        ? metadataAlt.Trim()
                        : PrettifyFileName(blob.Name);

                    candidates.Add(new Candidate(
                        new GalleryImage(
                            BuildPublicUrl(settings, blob.Name),
                            alt,
                            Width: null,
                            Height: null,
                            Category: category),
                        blob.Properties.LastModified,
                        blob.Name));
                }

                log.LogInformation(
                    "Game gallery prefix {Prefix} returned {Count} supported images",
                    prefix,
                    candidates.Count - countBeforePrefix);
            }
            catch (RequestFailedException ex)
            {
                // A missing or temporarily unavailable sport folder must not hide
                // images successfully listed from the other sports.
                log.LogWarning(ex,
                    "Could not list game gallery prefix {Prefix} in container {Container}",
                    prefix,
                    settings.Container);
            }
        }

        var images = candidates
            .OrderByDescending(item => item.LastModified)
            .ThenBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
            .Select(item => item.Image)
            .ToArray();

        log.LogInformation(
            "Game gallery refresh completed with {Count} images in {ElapsedMs}ms",
            images.Length,
            refreshTimer.ElapsedMilliseconds);

        return images;
    }

    private static string NormalisePrefix(string prefix) => $"{prefix.Trim().Trim('/')}/";

    private static string ToCategory(string prefix)
    {
        var name = prefix.Trim('/').Replace('-', ' ').Replace('_', ' ');
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(name.ToLowerInvariant());
    }

    private static string BuildPublicUrl(GameGalleryOptions settings, string blobName)
    {
        var baseUrl = string.IsNullOrWhiteSpace(settings.PublicBaseUrl)
            ? settings.AccountUri
            : settings.PublicBaseUrl;
        var encodedName = string.Join('/', blobName.Split('/').Select(Uri.EscapeDataString));
        return $"{baseUrl.TrimEnd('/')}/{Uri.EscapeDataString(settings.Container)}/{encodedName}";
    }

    private static string PrettifyFileName(string blobName)
    {
        var raw = Path.GetFileNameWithoutExtension(blobName).Replace('-', ' ').Replace('_', ' ');
        var words = Whitespace().Replace(raw, " ").Trim();
        if (string.IsNullOrEmpty(words)) return "EPL Season 2 game-day photo";
        return char.ToUpperInvariant(words[0]) + words[1..];
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    private sealed record Candidate(GalleryImage Image, DateTimeOffset? LastModified, string Name);
}
