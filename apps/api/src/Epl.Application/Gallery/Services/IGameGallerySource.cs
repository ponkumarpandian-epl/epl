using Epl.Application.Gallery.Dtos;

namespace Epl.Application.Gallery.Services;

/// <summary>
/// Lists game-day gallery images without exposing the backing storage provider
/// to the Application layer.
/// </summary>
public interface IGameGallerySource
{
    Task<IReadOnlyList<GalleryImage>> ListSeason2Async(CancellationToken ct = default);
}
