namespace Epl.Domain.Abstractions;

/// <summary>
/// Abstract over where profile avatars are stored.
/// Today: local disk under <c>wwwroot/avatars/</c>.
/// Tomorrow: Azure Blob Storage (swap the implementation; the contract is stable).
/// </summary>
public interface IProfileImageStore
{
    /// <summary>
    /// Persist the image and return a relative URL the client can fetch
    /// (e.g. <c>/api/profile/avatar/{userId}?v={ticks}</c>).
    /// </summary>
    Task<string> SaveAsync(Guid userId, Stream content, string extension, CancellationToken ct = default);

    /// <summary>Open the bytes + content-type for serving back to the client.</summary>
    Task<(Stream? Stream, string? ContentType)> OpenAsync(Guid userId, CancellationToken ct = default);
}
