using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface IUserSkillRepository
{
    Task<List<UserGameSkill>> ListByUserAsync(Guid userId, CancellationToken ct = default);
    Task<List<UserGameSkill>> ListByUserForUpdateAsync(Guid userId, CancellationToken ct = default);
    void Add(UserGameSkill skill);
    void Remove(UserGameSkill skill);
}
