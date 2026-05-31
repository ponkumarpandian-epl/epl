using Epl.Application.Seasons.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Seasons.Services;

public interface ISeasonService
{
    Task<SeasonDto?> GetCurrentAsync(CancellationToken ct = default);
    Task<SeasonDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<SeasonDto>> ListAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<GameDto>>   ListGamesAsync(CancellationToken ct = default);

    // Admin
    Task<Result<SeasonDto>>      CreateAsync(CreateSeasonRequest req, CancellationToken ct = default);
    Task<Result<SeasonDto>>      AddGameAsync(Guid seasonId, AddSeasonGameRequest req, CancellationToken ct = default);
    Task<Result<SeasonDto>>      SetActiveAsync(Guid seasonId, CancellationToken ct = default);
    Task<Result<SeasonDto>>      SetRegistrationAsync(Guid seasonId, bool open, CancellationToken ct = default);
    Task<Result<SeasonDto>>      SetGameRegistrationAsync(Guid seasonId, Guid seasonGameId, bool open, CancellationToken ct = default);

    // Public, cache-friendly stats used by the hero-banner ticker.
    Task<RegistrationStatsDto?>  GetCurrentRegistrationStatsAsync(CancellationToken ct = default);
}
