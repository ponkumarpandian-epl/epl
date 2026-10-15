using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class UserDirectoryRepository(AppDbContext db) : IUserDirectoryRepository
{
    private DbSet<AppUser> Users => db.Set<AppUser>();

    public async Task<IReadOnlyList<AppUser>> SearchAsync(string term, int limit, CancellationToken ct = default)
    {
        var t = term.ToLower();
        return await Users.AsNoTracking()
            .Where(u => u.FullName.ToLower().Contains(t)
                     || (u.PhoneNumber != null && u.PhoneNumber.Contains(term))
                     || (u.Email != null && u.Email.ToLower().Contains(t)))
            .OrderBy(u => u.FullName)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<(IReadOnlyList<AppUser> Items, int Total)> ListAsync(
        string? q, int page, int pageSize, CancellationToken ct = default)
    {
        var query = Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var t = q.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(t)
                                  || (u.PhoneNumber != null && u.PhoneNumber.Contains(t))
                                  || (u.Email != null && u.Email.ToLower().Contains(t)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public Task<AppUser?> GetAsync(Guid id, CancellationToken ct = default)
        => Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task<IReadOnlyList<Team>> ListCaptainedTeamsAsync(Guid userId, CancellationToken ct = default)
        => await db.Set<Team>().AsNoTracking()
            .Include(t => t.Apartment)
            .Include(t => t.SeasonGame).ThenInclude(sg => sg!.Season)
            .Where(t => t.CaptainUserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);
}
