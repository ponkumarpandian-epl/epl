using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ITeamRepository : IRepository<Team>
{
    Task<bool> ExistsByNameInApartmentAsync(string teamName, Sport sport, Guid apartmentId, CancellationToken ct = default);

    Task<(IReadOnlyList<Team> Items, int Total)> ListAsync(
        Sport?       sport,
        string?      search,
        Guid?        seasonId,
        TeamStatus?  status,
        int          page,
        int          pageSize,
        CancellationToken ct = default);

    Task<Team?> GetWithApartmentAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Per-SeasonGame team counts for the given season. Single GROUP BY query.
    /// Returns a dictionary keyed by SeasonGame.Id; missing entries imply zero.
    /// </summary>
    Task<IReadOnlyDictionary<Guid, int>> CountBySeasonGameAsync(Guid seasonId, CancellationToken ct = default);

    /// <summary>
    /// Public listing — active teams for the active season's game matching the slug
    /// ("cricket" / "badminton" / "volleyball"). Ordered by team name.
    /// Only includes <see cref="TeamStatus.Active"/> rows.
    /// </summary>
    Task<IReadOnlyList<Team>> ListActiveByActiveSeasonGameSlugAsync(string sportSlug, CancellationToken ct = default);
}
