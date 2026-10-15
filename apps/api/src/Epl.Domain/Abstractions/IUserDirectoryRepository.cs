using Epl.Domain.Entities;

namespace Epl.Domain.Abstractions;

/// <summary>
/// Read access over the Identity user table for search (plan/10 §3.3) and the admin
/// user console (§8). Returns detached <see cref="AppUser"/> rows; role lookups and
/// masking happen in the Application layer.
/// </summary>
public interface IUserDirectoryRepository
{
    /// <summary>Match name / phone / email (case-insensitive contains). Ordered by name.</summary>
    Task<IReadOnlyList<AppUser>> SearchAsync(string term, int limit, CancellationToken ct = default);

    /// <summary>Paged directory for the admin console. <paramref name="q"/> matches name/phone/email.</summary>
    Task<(IReadOnlyList<AppUser> Items, int Total)> ListAsync(string? q, int page, int pageSize, CancellationToken ct = default);

    Task<AppUser?> GetAsync(Guid id, CancellationToken ct = default);

    /// <summary>Teams the user captains — for the admin user-detail captaincy panel (§8.5).</summary>
    Task<IReadOnlyList<Team>> ListCaptainedTeamsAsync(Guid userId, CancellationToken ct = default);
}
