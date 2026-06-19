using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ITeamMemberRepository : IRepository<TeamMember>
{
    /// <summary>Active roster of a team, captain first then by name. Includes User.</summary>
    Task<IReadOnlyList<TeamMember>> ListActiveByTeamAsync(Guid teamId, CancellationToken ct = default);

    /// <summary>The single Active row for (team, user), if any. Tracked for updates.</summary>
    Task<TeamMember?> GetActiveAsync(Guid teamId, Guid userId, bool track = false, CancellationToken ct = default);

    Task<int> CountActiveByTeamAsync(Guid teamId, CancellationToken ct = default);

    /// <summary>
    /// True if the user already has an Active membership on some OTHER team that
    /// shares the same SeasonGame (enforces "one team per SeasonGame" — decision C8).
    /// </summary>
    Task<bool> ExistsActiveInSameSeasonGameAsync(
        Guid userId, Guid seasonGameId, Guid excludeTeamId, CancellationToken ct = default);

    /// <summary>Teams the user is an Active member of. Includes Team + Apartment + SeasonGame + Captain.</summary>
    Task<IReadOnlyList<TeamMember>> ListActiveByUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>A membership row with its Team loaded. Tracked when <paramref name="track"/>.</summary>
    Task<TeamMember?> GetWithTeamAsync(Guid id, bool track = false, CancellationToken ct = default);

    /// <summary>Most recent roster changes for a team (adds + removals), newest first. Includes User.</summary>
    Task<IReadOnlyList<TeamMember>> ListRecentByTeamAsync(Guid teamId, int limit, CancellationToken ct = default);
}
