namespace Epl.Domain.Abstractions;

public interface IUnitOfWork : IAsyncDisposable
{
    ITeamRepository               Teams                { get; }
    IApartmentRepository          Apartments           { get; }
    IGameRepository               Games                { get; }
    ISeasonRepository             Seasons              { get; }
    ISeasonGameRepository         SeasonGames          { get; }
    IUserSkillRepository          UserSkills           { get; }
    ITournamentRepository         Tournaments          { get; }
    ITournamentCategoryRepository TournamentCategories { get; }
    ITournamentEntryRepository    TournamentEntries    { get; }
    IBracketRepository            Brackets             { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
