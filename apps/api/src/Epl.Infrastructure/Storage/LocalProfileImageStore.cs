using Epl.Domain.Abstractions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;

namespace Epl.Infrastructure.Storage;

/// <summary>
/// Local-disk implementation of <see cref="IProfileImageStore"/>.
/// Writes to <c>{ContentRoot}/wwwroot/avatars/{userId}.{ext}</c>.
/// Swap with an Azure-Blob implementation in production by re-registering the interface.
/// </summary>
public class LocalProfileImageStore : IProfileImageStore
{
    private readonly string _root;
    private readonly ILogger<LocalProfileImageStore> _log;

    public LocalProfileImageStore(IWebHostEnvironment env, ILogger<LocalProfileImageStore> log)
    {
        _log = log;
        var webRoot = string.IsNullOrEmpty(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;
        _root = Path.Combine(webRoot, "avatars");
        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(Guid userId, Stream content, string extension, CancellationToken ct = default)
    {
        // Always overwrite the same file so admins can see "latest" without a DB cleanup.
        var ext  = string.IsNullOrWhiteSpace(extension) ? "jpg" : extension.Trim('.').ToLowerInvariant();
        var path = Path.Combine(_root, $"{userId}.{ext}");

        // Remove any older format for this user (e.g. previously .png, now .jpg).
        foreach (var stale in Directory.EnumerateFiles(_root, $"{userId}.*"))
        {
            if (!stale.Equals(path, StringComparison.OrdinalIgnoreCase))
                File.Delete(stale);
        }

        await using var fs = File.Create(path);
        await content.CopyToAsync(fs, ct);

        _log.LogInformation("Saved avatar for {UserId} → {Path} ({Bytes} bytes)", userId, path, fs.Length);

        // Cache-buster on the URL so the browser picks up a new image after upload.
        return $"/api/profile/avatar/{userId}?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
    }

    public Task<(Stream? Stream, string? ContentType)> OpenAsync(Guid userId, CancellationToken ct = default)
    {
        var hit = Directory.EnumerateFiles(_root, $"{userId}.*").FirstOrDefault();
        if (hit is null) return Task.FromResult<(Stream?, string?)>((null, null));

        var ext = Path.GetExtension(hit).TrimStart('.').ToLowerInvariant();
        var contentType = ext switch
        {
            "png"            => "image/png",
            "gif"            => "image/gif",
            "webp"           => "image/webp",
            "jpg" or "jpeg"  => "image/jpeg",
            _                => "application/octet-stream",
        };
        Stream s = File.OpenRead(hit);
        return Task.FromResult<(Stream?, string?)>((s, contentType));
    }
}
