using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ISeasonRepository : IRepository<Season>
{
    Task<Season?> GetActiveAsync(CancellationToken ct = default);
    Task<Season?> GetWithGamesAsync(Guid id, CancellationToken ct = default);
    Task<Season?> GetActiveWithGamesAsync(CancellationToken ct = default);
    Task<List<Season>> ListAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Tracked variant — for callers that intend to mutate <c>IsActive</c>
    /// or <c>RegistrationOpen</c> and then call SaveChanges.
    /// </summary>
    Task<List<Season>> ListAllForUpdateAsync(CancellationToken ct = default);
}
