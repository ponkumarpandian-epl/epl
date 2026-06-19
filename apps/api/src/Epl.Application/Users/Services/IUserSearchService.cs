using Epl.Application.Users.Dtos;

namespace Epl.Application.Users.Services;

public interface IUserSearchService
{
    /// <summary>
    /// Search registered users by name / mobile / email. Requires ≥2 chars; returns
    /// masked PII only. Used by captains building a roster (plan/10 §3.3, §4.2).
    /// </summary>
    Task<IReadOnlyList<UserSearchResultDto>> SearchAsync(string? q, int limit, CancellationToken ct = default);
}
