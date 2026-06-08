using Epl.Application.Brackets.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Brackets.Services;

public interface IBracketService
{
    /// <summary>Public read — returns null if the bracket isn't published yet.</summary>
    Task<BracketViewDto?> GetPublicAsync(Guid bracketId, CancellationToken ct = default);

    /// <summary>Public read by (parentType, parentId) — used by tournament detail pages.</summary>
    Task<BracketViewDto?> GetPublicByParentAsync(string parentType, Guid parentId, CancellationToken ct = default);

    /// <summary>Admin read — returns even unpublished brackets.</summary>
    Task<BracketViewDto?> GetForAdminAsync(Guid bracketId, CancellationToken ct = default);

    /// <summary>Admin read by (parentType, parentId) — used by the admin tournament page.</summary>
    Task<BracketViewDto?> GetByParentForAdminAsync(string parentType, Guid parentId, CancellationToken ct = default);

    /// <summary>
    /// Creates an empty bracket for the given parent. For TournamentCategory the implementation
    /// also auto-seeds from the category's Confirmed entries — admins can reseed afterwards.
    /// </summary>
    Task<Result<BracketViewDto>> CreateAsync(CreateBracketRequest req, CancellationToken ct = default);

    /// <summary>
    /// Replaces the participant list and regenerates rounds + matches. Refuses if any match
    /// has already started (Status >= InProgress) to protect historical scoring.
    /// </summary>
    Task<Result<BracketViewDto>> SeedAsync(Guid bracketId, SeedBracketRequest req, CancellationToken ct = default);

    /// <summary>Flip the IsPublished gate so the public bracket view becomes live.</summary>
    Task<Result<BracketViewDto>> PublishAsync(Guid bracketId, bool publish, CancellationToken ct = default);
}
