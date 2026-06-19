namespace Epl.Domain.Abstractions;

public interface IUnitOfWork : IAsyncDisposable
{
    ITeamRepository        Teams       { get; }
    ITeamMemberRepository  TeamMembers { get; }
    IUserDirectoryRepository Users     { get; }
    IApartmentRepository   Apartments  { get; }
    IGameRepository        Games       { get; }
    ISeasonRepository      Seasons     { get; }
    ISeasonGameRepository  SeasonGames { get; }
    IUserSkillRepository   UserSkills  { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
