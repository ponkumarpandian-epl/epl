using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

public interface IBracketRepository : IRepository<Bracket>
{
    /// <summary>Full bracket tree — Participants + Rounds + Matches.</summary>
    Task<Bracket?> GetFullAsync(Guid id, CancellationToken ct = default);

    /// <summary>Find the bracket attached to a specific parent (e.g. a TournamentCategory).</summary>
    Task<Bracket?> GetByParentAsync(string parentType, Guid parentId, CancellationToken ct = default);

    /// <summary>
    /// Wipes Participants + Rounds + Matches for a bracket so the generator can rebuild from scratch.
    /// Caller must call SaveChangesAsync to commit.
    /// </summary>
    Task ClearChildrenAsync(Guid bracketId, CancellationToken ct = default);

    /// <summary>True if any match in the bracket is InProgress or Complete — used to lock reseeding.</summary>
    Task<bool> AnyMatchStartedAsync(Guid bracketId, CancellationToken ct = default);
}
