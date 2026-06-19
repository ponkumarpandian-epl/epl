using Epl.Application.Teams.Dtos;
using Epl.Application.Users.Dtos;
using Epl.Domain.Common;

namespace Epl.Application.Users.Services;

/// <summary>Admin user &amp; role management (plan/10 §8).</summary>
public interface IUserRoleAdminService
{
    Task<PagedResponse<AdminUserDto>> SearchAsync(string? q, string? role, int page, int pageSize, CancellationToken ct = default);

    Task<AdminUserDetailDto?> GetAsync(Guid userId, CancellationToken ct = default);

    Task<Result<bool>> GrantAsync(Guid userId, string role, Guid actorId, CancellationToken ct = default);

    Task<Result<bool>> RevokeAsync(Guid userId, string role, Guid actorId, CancellationToken ct = default);
}
