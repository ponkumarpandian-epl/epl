using Epl.Application.Teams.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Teams.Services;

public interface ITeamService
{
    Task<Result<TeamResponse>> CreateAsync(CreateTeamRequest req, Guid? currentUserId, CancellationToken ct = default);
    Task<PagedResponse<TeamResponse>> ListAsync(TeamListQuery query, CancellationToken ct = default);
    Task<TeamResponse?> GetAsync(Guid id, CancellationToken ct = default);
}
