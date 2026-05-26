using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class GameRepository(AppDbContext db) : Repository<Game>(db), IGameRepository
{
    public Task<Game?> FindBySlugAsync(string slug, CancellationToken ct = default)
        => Set.FirstOrDefaultAsync(g => g.Slug == slug, ct);

    public Task<Game?> FindByKindAsync(Sport kind, CancellationToken ct = default)
        => Set.FirstOrDefaultAsync(g => g.Kind == kind, ct);
}
