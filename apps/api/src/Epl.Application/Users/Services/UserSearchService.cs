using Epl.Application.Common;
using Epl.Application.Users.Dtos;
using Epl.Domain.Abstractions;

namespace Epl.Application.Users.Services;

public class UserSearchService(IUnitOfWork uow) : IUserSearchService
{
    public async Task<IReadOnlyList<UserSearchResultDto>> SearchAsync(string? q, int limit, CancellationToken ct = default)
    {
        var term = (q ?? string.Empty).Trim();
        // Require a couple of characters so we don't return the whole directory.
        if (term.Length < 2) return Array.Empty<UserSearchResultDto>();

        var rows = await uow.Users.SearchAsync(term, Math.Clamp(limit, 1, 25), ct);
        return rows
            .Select(u => new UserSearchResultDto(u.Id, u.FullName, Mask.Phone(u.PhoneNumber), u.AvatarUrl))
            .ToList();
    }
}
