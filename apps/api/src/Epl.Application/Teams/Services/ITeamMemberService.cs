using Epl.Application.Teams.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Teams.Services;

public interface ITeamMemberService
{
    // ── Captain dashboard + roster (C-2) ───────────────────────────────────
    Task<IReadOnlyList<CaptainTeamDto>> ListCaptainTeamsAsync(Guid captainUserId, CancellationToken ct = default);
    Task<TeamRosterDto?> GetRosterAsync(Guid teamId, CancellationToken ct = default);
    Task<Result<TeamMemberDto>> AddMemberAsync(Guid teamId, AddTeamMemberRequest req, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default);
    Task<Result<TeamMemberDto>> UpdateMemberAsync(Guid teamId, Guid memberId, UpdateTeamMemberRequest req, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default);
    Task<Result<bool>> RemoveMemberAsync(Guid teamId, Guid memberId, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default);

    // ── Player side (C-5) ──────────────────────────────────────────────────
    Task<IReadOnlyList<MyTeamDto>> ListMyTeamsAsync(Guid userId, CancellationToken ct = default);
    Task<Result<bool>> LeaveTeamAsync(Guid membershipId, Guid userId, CancellationToken ct = default);

    // ── Transfer captaincy (C-6) ───────────────────────────────────────────
    Task<Result<bool>> TransferCaptaincyAsync(Guid teamId, Guid newCaptainUserId, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default);

    // ── Audit strip (C-7) ──────────────────────────────────────────────────
    Task<IReadOnlyList<RosterChangeDto>> ListRecentChangesAsync(Guid teamId, int limit, CancellationToken ct = default);
}
