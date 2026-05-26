using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Repositories;

public class UserSkillRepository(AppDbContext db) : IUserSkillRepository
{
    private readonly DbSet<UserGameSkill> _set = db.UserGameSkills;

    public Task<List<UserGameSkill>> ListByUserAsync(Guid userId, CancellationToken ct = default)
        => _set.AsNoTracking()
               .Include(s => s.Game)
               .Where(s => s.UserId == userId)
               .ToListAsync(ct);

    public Task<List<UserGameSkill>> ListByUserForUpdateAsync(Guid userId, CancellationToken ct = default)
        => _set.Where(s => s.UserId == userId).ToListAsync(ct);   // tracked

    public void Add(UserGameSkill skill)     => _set.Add(skill);
    public void Remove(UserGameSkill skill)  => _set.Remove(skill);
}
