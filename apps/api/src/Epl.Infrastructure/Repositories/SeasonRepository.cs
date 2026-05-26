using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class SeasonRepository(AppDbContext db) : Repository<Season>(db), ISeasonRepository
{
    public Task<Season?> GetActiveAsync(CancellationToken ct = default)
        => Set.FirstOrDefaultAsync(s => s.IsActive, ct);

    public Task<Season?> GetWithGamesAsync(Guid id, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(s => s.Games).ThenInclude(g => g.Game)
              .FirstOrDefaultAsync(s => s.Id == id, ct);

    public Task<Season?> GetActiveWithGamesAsync(CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(s => s.Games).ThenInclude(g => g.Game)
              .FirstOrDefaultAsync(s => s.IsActive, ct);

    public Task<List<Season>> ListAllAsync(CancellationToken ct = default)
        => Set.AsNoTracking().OrderByDescending(s => s.Year).ToListAsync(ct);

    public Task<List<Season>> ListAllForUpdateAsync(CancellationToken ct = default)
        => Set.ToListAsync(ct);   // tracked
}
