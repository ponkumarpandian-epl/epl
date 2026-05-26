using System.IO;
using Epl.Application.Profile.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Profile.Services;

public interface IProfileService
{
    Task<ProfileResponse?> GetAsync(Guid userId, CancellationToken ct = default);
    Task<Result<ProfileResponse>> UpdateSkillsAsync(Guid userId, UpdateSkillsRequest req, CancellationToken ct = default);

    /// <summary>
    /// Stores the avatar in the configured profile-image store and updates
    /// <c>AppUser.AvatarUrl</c>. Today that's local disk under wwwroot/avatars;
    /// the contract is stable so we can swap to Azure Blob Storage later.
    /// </summary>
    Task<Result<string>> UploadAvatarAsync(Guid userId, Stream content, string contentType, string fileName, CancellationToken ct = default);

    /// <summary>Open a stream over the avatar bytes for serving via API.</summary>
    Task<(Stream? Stream, string? ContentType)> OpenAvatarAsync(Guid userId, CancellationToken ct = default);
}
