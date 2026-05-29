using Epl.Application.Tournaments.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Tournaments.Services;

public interface ITournamentService
{
    // ── Public ────────────────────────────────────────────────────────────
    Task<IReadOnlyList<TournamentSummaryDto>> ListPublishedAsync(CancellationToken ct = default);
    Task<TournamentDetailDto?>                GetBySlugAsync(string slug, CancellationToken ct = default);

    // ── Admin ─────────────────────────────────────────────────────────────
    Task<IReadOnlyList<TournamentSummaryDto>> ListAllAsync(CancellationToken ct = default);
    Task<TournamentDetailDto?>                GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<Result<TournamentDetailDto>>         CreateAsync(CreateTournamentRequest req, CancellationToken ct = default);
    Task<Result<TournamentDetailDto>>         UpdateAsync(Guid id, UpdateTournamentRequest req, CancellationToken ct = default);
    Task<Result<TournamentDetailDto>>         PublishAsync(Guid id, bool publish, CancellationToken ct = default);
    Task<Result<TournamentDetailDto>>         SetRegistrationAsync(Guid id, bool open, CancellationToken ct = default);

    Task<Result<TournamentDetailDto>>         UpsertCategoryAsync(Guid tournamentId, UpsertTournamentCategoryRequest req, CancellationToken ct = default);
    Task<Result<TournamentDetailDto>>         DeleteCategoryAsync(Guid tournamentId, Guid categoryId, CancellationToken ct = default);
}
