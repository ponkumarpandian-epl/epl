using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ITournamentCategoryRepository : IRepository<TournamentCategory>
{
    /// <summary>All categories for a given Tournament, sorted by Format enum.</summary>
    Task<List<TournamentCategory>> ListByTournamentAsync(Guid tournamentId, CancellationToken ct = default);
}
