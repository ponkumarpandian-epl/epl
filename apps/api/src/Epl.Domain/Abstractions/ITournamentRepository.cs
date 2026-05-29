using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ITournamentRepository : IRepository<Tournament>
{
    /// <summary>Detail view — includes categories, ordered by Format enum.</summary>
    Task<Tournament?> GetWithCategoriesAsync(Guid id, CancellationToken ct = default);

    /// <summary>Slug lookup — used by public detail pages.</summary>
    Task<Tournament?> GetBySlugAsync(string slug, CancellationToken ct = default);

    /// <summary>Public list — only published tournaments, ordered by StartsOn.</summary>
    Task<List<Tournament>> ListPublishedAsync(CancellationToken ct = default);

    /// <summary>Admin list — all tournaments, drafts included. Includes categories for counts.</summary>
    Task<List<Tournament>> ListAllWithCategoriesAsync(CancellationToken ct = default);
}
