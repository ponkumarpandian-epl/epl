using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class BracketRepository(AppDbContext db) : Repository<Bracket>(db), IBracketRepository
{
    public Task<Bracket?> GetFullAsync(Guid id, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(b => b.Participants)
              .Include(b => b.Rounds.OrderBy(r => r.OrderIndex))
              .Include(b => b.Matches)
              .FirstOrDefaultAsync(b => b.Id == id, ct);

    public Task<Bracket?> GetByParentAsync(string parentType, Guid parentId, CancellationToken ct = default)
        => Set.AsNoTracking()
              .Include(b => b.Participants)
              .Include(b => b.Rounds.OrderBy(r => r.OrderIndex))
              .Include(b => b.Matches)
              .FirstOrDefaultAsync(b => b.ParentType == parentType && b.ParentId == parentId, ct);

    public async Task ClearChildrenAsync(Guid bracketId, CancellationToken ct = default)
    {
        await Db.Matches.Where(m => m.BracketId == bracketId).ExecuteDeleteAsync(ct);
        await Db.BracketParticipants.Where(p => p.BracketId == bracketId).ExecuteDeleteAsync(ct);
        await Db.BracketRounds.Where(r => r.BracketId == bracketId).ExecuteDeleteAsync(ct);
    }

    public Task<bool> AnyMatchStartedAsync(Guid bracketId, CancellationToken ct = default)
        => Db.Matches.AsNoTracking().AnyAsync(
            m => m.BracketId == bracketId
              && (m.Status == Epl.Domain.Entities.MatchStatus.InProgress
               || m.Status == Epl.Domain.Entities.MatchStatus.Complete),
            ct);
}
