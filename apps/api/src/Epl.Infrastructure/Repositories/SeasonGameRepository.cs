using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class SeasonGameRepository(AppDbContext db) : Repository<SeasonGame>(db), ISeasonGameRepository
{
    public Task<SeasonGame?> GetWithGameAsync(Guid id, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(sg => sg.Game)
              .Include(sg => sg.Season)
              .FirstOrDefaultAsync(sg => sg.Id == id, ct);

    public Task<SeasonGame?> FindInActiveSeasonBySlugAsync(string gameSlug, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(sg => sg.Game)
              .Include(sg => sg.Season)
              .Where(sg => sg.Season.IsActive && sg.Game.Slug == gameSlug)
              .FirstOrDefaultAsync(ct);

    public Task<List<SeasonGame>> ListBySeasonForUpdateAsync(Guid seasonId, CancellationToken ct = default)
        => Set.Where(sg => sg.SeasonId == seasonId).ToListAsync(ct);   // tracked
}
