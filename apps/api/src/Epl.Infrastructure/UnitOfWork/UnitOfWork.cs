using Epl.Domain.Abstractions;
using Epl.Infrastructure.Persistence;
using Epl.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore.Storage;

namespace Epl.Infrastructure.UnitOfWork;

public class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    private readonly AppDbContext _db = db;
    private IDbContextTransaction? _tx;

    private ITeamRepository?               _teams;
    private IApartmentRepository?          _apartments;
    private IGameRepository?               _games;
    private ISeasonRepository?             _seasons;
    private ISeasonGameRepository?         _seasonGames;
    private IUserSkillRepository?          _userSkills;
    private ITournamentRepository?         _tournaments;
    private ITournamentCategoryRepository? _tournamentCategories;
    private ITournamentEntryRepository?    _tournamentEntries;
    private IBracketRepository?            _brackets;

    public ITeamRepository               Teams                => _teams                ??= new TeamRepository(_db);
    public IApartmentRepository          Apartments           => _apartments           ??= new ApartmentRepository(_db);
    public IGameRepository               Games                => _games                ??= new GameRepository(_db);
    public ISeasonRepository             Seasons              => _seasons              ??= new SeasonRepository(_db);
    public ISeasonGameRepository         SeasonGames          => _seasonGames          ??= new SeasonGameRepository(_db);
    public IUserSkillRepository          UserSkills           => _userSkills           ??= new UserSkillRepository(_db);
    public ITournamentRepository         Tournaments          => _tournaments          ??= new TournamentRepository(_db);
    public ITournamentCategoryRepository TournamentCategories => _tournamentCategories ??= new TournamentCategoryRepository(_db);
    public ITournamentEntryRepository    TournamentEntries    => _tournamentEntries    ??= new TournamentEntryRepository(_db);
    public IBracketRepository            Brackets             => _brackets             ??= new BracketRepository(_db);

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        _tx ??= await _db.Database.BeginTransactionAsync(ct);
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_tx is null) return;
        await _tx.CommitAsync(ct);
        await _tx.DisposeAsync();
        _tx = null;
    }

    public async Task RollbackAsync(CancellationToken ct = default)
    {
        if (_tx is null) return;
        await _tx.RollbackAsync(ct);
        await _tx.DisposeAsync();
        _tx = null;
    }

    public async ValueTask DisposeAsync()
    {
        if (_tx is not null)
        {
            await _tx.DisposeAsync();
            _tx = null;
        }
        GC.SuppressFinalize(this);
    }
}
