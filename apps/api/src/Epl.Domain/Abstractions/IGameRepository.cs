using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface IGameRepository : IRepository<Game>
{
    Task<Game?> FindBySlugAsync(string slug, CancellationToken ct = default);
    Task<Game?> FindByKindAsync(Sport kind, CancellationToken ct = default);
}
