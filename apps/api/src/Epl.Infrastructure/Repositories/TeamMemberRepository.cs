using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class TeamMemberRepository(AppDbContext db) : Repository<TeamMember>(db), ITeamMemberRepository
{
    public async Task<IReadOnlyList<TeamMember>> ListActiveByTeamAsync(Guid teamId, CancellationToken ct = default)
        => await Set.AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.TeamId == teamId && m.Status == TeamMemberStatus.Active)
            .OrderByDescending(m => m.IsCaptain)
            .ThenBy(m => m.User.FullName)
            .ToListAsync(ct);

    public Task<TeamMember?> GetActiveAsync(Guid teamId, Guid userId, bool track = false, CancellationToken ct = default)
    {
        var q = track ? Set.AsQueryable() : Set.AsNoTracking();
        return q.FirstOrDefaultAsync(
            m => m.TeamId == teamId && m.UserId == userId && m.Status == TeamMemberStatus.Active, ct);
    }

    public Task<int> CountActiveByTeamAsync(Guid teamId, CancellationToken ct = default)
        => Set.AsNoTracking()
            .CountAsync(m => m.TeamId == teamId && m.Status == TeamMemberStatus.Active, ct);

    public Task<bool> ExistsActiveInSameSeasonGameAsync(
        Guid userId, Guid seasonGameId, Guid excludeTeamId, CancellationToken ct = default)
        => Set.AsNoTracking()
            .AnyAsync(m =>
                m.UserId == userId
                && m.Status == TeamMemberStatus.Active
                && m.TeamId != excludeTeamId
                && m.Team.SeasonGameId == seasonGameId, ct);

    public async Task<IReadOnlyList<TeamMember>> ListActiveByUserAsync(Guid userId, CancellationToken ct = default)
        => await Set.AsNoTracking()
            .Include(m => m.Team).ThenInclude(t => t.Apartment)
            .Include(m => m.Team).ThenInclude(t => t.Captain)
            .Include(m => m.Team).ThenInclude(t => t.SeasonGame).ThenInclude(sg => sg!.Season)
            .Include(m => m.Team).ThenInclude(t => t.SeasonGame).ThenInclude(sg => sg!.Game)
            .Where(m => m.UserId == userId && m.Status == TeamMemberStatus.Active)
            .OrderByDescending(m => m.AddedAt)
            .ToListAsync(ct);

    public Task<TeamMember?> GetWithTeamAsync(Guid id, bool track = false, CancellationToken ct = default)
    {
        var q = track ? Set.AsQueryable() : Set.AsNoTracking();
        return q.Include(m => m.Team).FirstOrDefaultAsync(m => m.Id == id, ct);
    }

    public async Task<IReadOnlyList<TeamMember>> ListRecentByTeamAsync(Guid teamId, int limit, CancellationToken ct = default)
        => await Set.AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.TeamId == teamId)
            // Order by the most recent event on the row (removal beats add when present).
            .OrderByDescending(m => m.RemovedAt ?? m.AddedAt)
            .Take(limit)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<TeamMember>> ListActivePlaceholdersByMobileAsync(
        string mobileE164, bool track = false, CancellationToken ct = default)
    {
        var q = track ? Set.AsQueryable() : Set.AsNoTracking();
        return await q
            .Include(m => m.Team).ThenInclude(t => t.SeasonGame)
            .Where(m => m.Status == TeamMemberStatus.Active
                     && m.UserId == null
                     && m.PlaceholderMobile == mobileE164)
            .OrderBy(m => m.AddedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<TeamMember>> ListPendingLinksByUserAsync(
        Guid userId, CancellationToken ct = default)
        => await Set.AsNoTracking()
            .Include(m => m.Team).ThenInclude(t => t.Apartment)
            .Include(m => m.Team).ThenInclude(t => t.SeasonGame).ThenInclude(sg => sg!.Season)
            .Where(m => m.Status == TeamMemberStatus.Active
                     && m.UserId == userId
                     && m.LinkedFromPlaceholder
                     && m.AcknowledgedAt == null)
            .OrderBy(m => m.AddedAt)
            .ToListAsync(ct);
}
