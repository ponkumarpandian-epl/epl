using Epl.Application.Tournaments.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Tournaments.Services;

public interface ITournamentEntryService
{
    // ── Public ─────────────────────────────────────────────────────────────

    /// <summary>List of confirmed + pending entries for a category (omits Withdrawn).</summary>
    Task<IReadOnlyList<TournamentEntryDto>> ListPublicAsync(Guid categoryId, CancellationToken ct = default);

    /// <summary>Per-category counts so the detail page can render "12 / 16 spots filled".</summary>
    Task<TournamentCategoryCountsDto> GetCountsAsync(Guid categoryId, CancellationToken ct = default);

    /// <summary>
    /// Public registration. Open to logged-out users; if <paramref name="userId"/> is supplied,
    /// it's stamped onto Player1UserId so the entry is owned by the logged-in player.
    /// </summary>
    Task<Result<TournamentEntryDto>> RegisterAsync(
        string slug, Guid categoryId, RegisterTournamentEntryRequest req, Guid? userId, CancellationToken ct = default);

    // ── Admin ──────────────────────────────────────────────────────────────

    Task<IReadOnlyList<AdminTournamentEntryDto>> ListForAdminAsync(Guid categoryId, CancellationToken ct = default);

    Task<Result<AdminTournamentEntryDto>> SetSeedAsync(Guid entryId, int? seed, CancellationToken ct = default);

    Task<Result<AdminTournamentEntryDto>> SetStatusAsync(Guid entryId, Domain.Entities.EntryStatus status, CancellationToken ct = default);
}
