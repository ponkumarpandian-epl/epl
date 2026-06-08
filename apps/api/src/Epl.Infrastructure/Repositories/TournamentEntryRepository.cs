using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class TournamentEntryRepository(AppDbContext db)
    : Repository<TournamentEntry>(db), ITournamentEntryRepository
{
    public Task<List<TournamentEntry>> ListByCategoryAsync(Guid categoryId, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Where(e => e.TournamentCategoryId == categoryId)
              .OrderBy(e => e.CreatedAt)
              .ToListAsync(ct);

    public async Task<(int Total, int Confirmed)> CountByCategoryAsync(Guid categoryId, CancellationToken ct = default)
    {
        var rows = await Set.AsNoTracking()
            .Where(e => e.TournamentCategoryId == categoryId && e.Status != EntryStatus.Withdrawn)
            .GroupBy(e => e.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var total     = rows.Sum(r => r.Count);
        var confirmed = rows.Where(r => r.Status == EntryStatus.Confirmed).Sum(r => r.Count);
        return (total, confirmed);
    }

    public async Task<IReadOnlyDictionary<Guid, (int Total, int Confirmed)>> CountByTournamentAsync(
        Guid tournamentId, CancellationToken ct = default)
    {
        var rows = await Set.AsNoTracking()
            .Where(e => e.TournamentCategory.TournamentId == tournamentId && e.Status != EntryStatus.Withdrawn)
            .GroupBy(e => new { e.TournamentCategoryId, e.Status })
            .Select(g => new { g.Key.TournamentCategoryId, g.Key.Status, Count = g.Count() })
            .ToListAsync(ct);

        return rows
            .GroupBy(r => r.TournamentCategoryId)
            .ToDictionary(
                g => g.Key,
                g => (
                    Total:     g.Sum(x => x.Count),
                    Confirmed: g.Where(x => x.Status == EntryStatus.Confirmed).Sum(x => x.Count)));
    }

    public Task<bool> AnyActiveByMobileAsync(Guid categoryId, string mobile, CancellationToken ct = default)
        => Set.AsNoTracking()
              .AnyAsync(e => e.TournamentCategoryId == categoryId
                          && e.Player1Mobile == mobile
                          && e.Status != EntryStatus.Withdrawn, ct);
}
