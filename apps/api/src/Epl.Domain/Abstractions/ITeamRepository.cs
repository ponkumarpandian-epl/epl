using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface ITeamRepository : IRepository<Team>
{
    Task<bool> ExistsByNameInApartmentAsync(string teamName, Sport sport, Guid apartmentId, CancellationToken ct = default);

    Task<(IReadOnlyList<Team> Items, int Total)> ListAsync(
        Sport?  sport,
        string? search,
        Guid?   seasonId,
        int     page,
        int     pageSize,
        CancellationToken ct = default);

    Task<Team?> GetWithApartmentAsync(Guid id, CancellationToken ct = default);
}
