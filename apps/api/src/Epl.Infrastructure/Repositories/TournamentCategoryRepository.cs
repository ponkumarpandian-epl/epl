using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class TournamentCategoryRepository(AppDbContext db)
    : Repository<TournamentCategory>(db), ITournamentCategoryRepository
{
    public Task<List<TournamentCategory>> ListByTournamentAsync(Guid tournamentId, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Where(c => c.TournamentId == tournamentId)
              .OrderBy(c => c.Format)
              .ToListAsync(ct);
}
