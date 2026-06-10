using Epl.Application.Teams.Dtos;
using Epl.Domain.Common;
using Epl.Domain.Entities;

namespace Epl.Application.Teams.Services;

public interface ITeamService
{
    Task<Result<TeamResponse>> CreateAsync(CreateTeamRequest req, Guid? currentUserId, CancellationToken ct = default);
    Task<PagedResponse<TeamResponse>> ListAsync(TeamListQuery query, CancellationToken ct = default);
    Task<TeamResponse?> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<TeamResponse>> SetPaymentAsync(Guid teamId, bool paid, string? paidTo, CancellationToken ct = default);

    /// <summary>Admin — update a team's lifecycle status + optional note.</summary>
    Task<Result<TeamResponse>> SetStatusAsync(Guid teamId, TeamStatus status, string? comment, CancellationToken ct = default);

    /// <summary>
    /// Public — Active teams for the active season's game matching the slug.
    /// Cached; invalidated on Team writes (Create / SetStatus).
    /// </summary>
    Task<IReadOnlyList<TeamPublicSummaryDto>> ListPublicByGameSlugAsync(string sportSlug, CancellationToken ct = default);
}
