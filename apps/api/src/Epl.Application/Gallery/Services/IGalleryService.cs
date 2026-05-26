using Epl.Application.Gallery.Dtos;

namespace Epl.Application.Gallery.Services;

public interface IGalleryService
{
    Task<GalleryResponse> ListAsync(CancellationToken ct = default);
}
