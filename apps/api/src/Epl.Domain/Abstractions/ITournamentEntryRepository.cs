using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ITournamentEntryRepository : IRepository<TournamentEntry>
{
    /// <summary>All entries for a category, oldest first.</summary>
    Task<List<TournamentEntry>> ListByCategoryAsync(Guid categoryId, CancellationToken ct = default);

    /// <summary>
    /// Per-category headline counts: total (all statuses except Withdrawn) and confirmed.
    /// Used to drive the public counter ("12 / 16 spots filled") and the admin summary.
    /// </summary>
    Task<(int Total, int Confirmed)> CountByCategoryAsync(Guid categoryId, CancellationToken ct = default);

    /// <summary>Cheap batch variant — one query for a whole tournament's categories.</summary>
    Task<IReadOnlyDictionary<Guid, (int Total, int Confirmed)>> CountByTournamentAsync(
        Guid tournamentId, CancellationToken ct = default);

    /// <summary>
    /// Check if a mobile number already has a non-withdrawn entry in this category — used to
    /// block double-registrations on the public form before the DB index would.
    /// </summary>
    Task<bool> AnyActiveByMobileAsync(Guid categoryId, string mobile, CancellationToken ct = default);
}
