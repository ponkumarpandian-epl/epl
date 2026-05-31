using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class TeamRepository(AppDbContext db) : Repository<Team>(db), ITeamRepository
{
    public Task<bool> ExistsByNameInApartmentAsync(string teamName, Sport sport, Guid apartmentId, CancellationToken ct = default)
        => Set.AsNoTracking().AnyAsync(
            t => t.ApartmentId == apartmentId && t.Sport == sport && t.Name == teamName,
            ct);

    public async Task<(IReadOnlyList<Team> Items, int Total)> ListAsync(
        Sport? sport, string? search, Guid? seasonId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = Set.AsNoTracking()
                    .Include(t => t.Apartment)
                    .Include(t => t.SeasonGame).ThenInclude(sg => sg!.Season)
                    .AsQueryable();

        if (sport.HasValue)    q = q.Where(t => t.Sport == sport.Value);
        if (seasonId.HasValue) q = q.Where(t => t.SeasonGame != null && t.SeasonGame.SeasonId == seasonId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(t =>
                t.Name.ToLower().Contains(s) ||
                t.CaptainName.ToLower().Contains(s) ||
                t.Apartment.Name.ToLower().Contains(s));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public Task<Team?> GetWithApartmentAsync(Guid id, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(t => t.Apartment)
              .Include(t => t.SeasonGame).ThenInclude(sg => sg!.Season)
              .FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<IReadOnlyDictionary<Guid, int>> CountBySeasonGameAsync(Guid seasonId, CancellationToken ct = default)
    {
        var rows = await Set.AsNoTracking()
            .Where(t => t.SeasonGameId != null && t.SeasonGame!.SeasonId == seasonId)
            .GroupBy(t => t.SeasonGameId!.Value)
            .Select(g => new { SeasonGameId = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.SeasonGameId, r => r.Count);
    }
}
