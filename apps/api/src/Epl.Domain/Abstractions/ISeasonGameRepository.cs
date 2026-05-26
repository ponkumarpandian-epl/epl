using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ISeasonGameRepository : IRepository<SeasonGame>
{
    Task<SeasonGame?> GetWithGameAsync(Guid id, CancellationToken ct = default);
    Task<SeasonGame?> FindInActiveSeasonBySlugAsync(string gameSlug, CancellationToken ct = default);

    /// <summary>
    /// Returns tracked entities — caller can mutate properties and then call
    /// <see cref="IUnitOfWork.SaveChangesAsync"/> to persist the changes.
    /// (Generic <see cref="IRepository{T}.ListAsync"/> uses AsNoTracking and is read-only.)
    /// </summary>
    Task<List<SeasonGame>> ListBySeasonForUpdateAsync(Guid seasonId, CancellationToken ct = default);
}
