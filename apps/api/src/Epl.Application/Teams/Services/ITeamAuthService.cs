namespace Epl.Application.Teams.Services;

/// <summary>
/// Resource-scoped captain perimeter. The <c>TeamCaptainOrAdmin</c> policy only
/// gates "is authenticated" — the actual per-team check needs the route's teamId,
/// so it lives here and is called from the service/controller (plan/10 §3.5).
/// </summary>
public interface ITeamAuthService
{
    /// <summary>True if the user is the team's captain (<see cref="Domain.Entities.Team.CaptainUserId"/>).</summary>
    Task<bool> IsCaptainAsync(Guid teamId, Guid userId, CancellationToken ct = default);
}
