using Epl.Domain.Abstractions;
using Epl.Domain.Entities;

namespace Epl.Application.Teams.Services;

public class TeamAuthService(IUnitOfWork uow) : ITeamAuthService
{
    public Task<bool> IsCaptainAsync(Guid teamId, Guid userId, CancellationToken ct = default)
        => uow.Teams.AnyAsync(t => t.Id == teamId && t.CaptainUserId == userId, ct);
}
