using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class TournamentRepository(AppDbContext db) : Repository<Tournament>(db), ITournamentRepository
{
    public Task<Tournament?> GetWithCategoriesAsync(Guid id, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(t => t.Game)
              .Include(t => t.Categories.OrderBy(c => c.Format))
              .FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<Tournament?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(t => t.Game)
              .Include(t => t.Categories.OrderBy(c => c.Format))
              .FirstOrDefaultAsync(t => t.Slug == slug, ct);

    public Task<List<Tournament>> ListPublishedAsync(CancellationToken ct = default)
        => Set.AsNoTracking()
              .Where(t => t.IsPublished)
              .Include(t => t.Game)
              .Include(t => t.Categories)
              .OrderBy(t => t.StartsOn ?? DateTimeOffset.MaxValue)
              .ToListAsync(ct);

    public Task<List<Tournament>> ListAllWithCategoriesAsync(CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(t => t.Game)
              .Include(t => t.Categories)
              .OrderByDescending(t => t.CreatedAt)
              .ToListAsync(ct);
}
