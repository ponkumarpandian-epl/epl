using Epl.Application.Common;
using Epl.Application.Teams.Dtos;
using Epl.Application.Users.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Users.Services;

public class UserRoleAdminService(
    IUnitOfWork                  uow,
    UserManager<AppUser>         users,
    ILogger<UserRoleAdminService> log) : IUserRoleAdminService
{
    public async Task<PagedResponse<AdminUserDto>> SearchAsync(
        string? q, string? role, int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        IReadOnlyList<AppUser> pageItems;
        int total;

        if (!string.IsNullOrWhiteSpace(role) && Roles.All.Contains(role))
        {
            var members = await users.GetUsersInRoleAsync(role);

            IEnumerable<AppUser> filtered = members;
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                filtered = members.Where(u =>
                    (u.FullName ?? "").Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    (u.Email ?? "").Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    (u.PhoneNumber ?? "").Contains(term, StringComparison.OrdinalIgnoreCase));
            }

            var ordered = filtered.OrderBy(u => u.FullName).ToList();
            total     = ordered.Count;
            pageItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        }
        else
        {
            (pageItems, total) = await uow.Users.ListAsync(q, page, pageSize, ct);
        }

        var items = new List<AdminUserDto>(pageItems.Count);
        foreach (var u in pageItems)
        {
            var roles = await users.GetRolesAsync(u);
            items.Add(new AdminUserDto(
                Id:          u.Id,
                FullName:    u.FullName,
                EmailMasked: Mask.Email(u.Email),
                PhoneMasked: Mask.Phone(u.PhoneNumber),
                Roles:       roles.ToArray()));
        }

        return new PagedResponse<AdminUserDto>(items, total, page, pageSize);
    }

    public async Task<AdminUserDetailDto?> GetAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return null;

        var roles     = await users.GetRolesAsync(user);
        var captained = await uow.Users.ListCaptainedTeamsAsync(userId, ct);

        var teams = captained
            .Select(t => new CaptainedTeamSummary(
                TeamId:     t.Id,
                TeamName:   t.Name,
                Sport:      t.Sport,
                SeasonLabel: t.SeasonGame?.Season?.Name))
            .ToList();

        return new AdminUserDetailDto(
            Id:          user.Id,
            FullName:    user.FullName,
            EmailMasked: Mask.Email(user.Email),
            PhoneMasked: Mask.Phone(user.PhoneNumber),
            Roles:       roles.ToArray(),
            CaptainedTeams: teams);
    }

    public async Task<Result<bool>> GrantAsync(Guid userId, string role, Guid actorId, CancellationToken ct = default)
    {
        if (!Roles.All.Contains(role))
            return Result<bool>.Fail("invalid_role", $"'{role}' is not a known role.");

        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return Result<bool>.Fail("user_not_found", "User not found.");

        if (await users.IsInRoleAsync(user, role)) return Result<bool>.Ok(true);

        var result = await users.AddToRoleAsync(user, role);
        if (!result.Succeeded)
        {
            var err = result.Errors.FirstOrDefault();
            return Result<bool>.Fail("role_update_failed", err?.Description ?? "Could not grant the role.");
        }

        log.LogInformation("Admin {ActorId} granted role {Role} to user {UserId}", actorId, role, userId);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<bool>> RevokeAsync(Guid userId, string role, Guid actorId, CancellationToken ct = default)
    {
        if (!Roles.All.Contains(role))
            return Result<bool>.Fail("invalid_role", $"'{role}' is not a known role.");

        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return Result<bool>.Fail("user_not_found", "User not found.");

        if (role == Roles.Admin)
        {
            if (userId == actorId)
                return Result<bool>.Fail("forbidden", "You can't remove your own Admin role.");

            var admins = await users.GetUsersInRoleAsync(Roles.Admin);
            if (admins.Count <= 1)
                return Result<bool>.Fail("last_admin", "Can't remove the last admin.");
        }

        if (!await users.IsInRoleAsync(user, role)) return Result<bool>.Ok(true);

        var result = await users.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded)
        {
            var err = result.Errors.FirstOrDefault();
            return Result<bool>.Fail("role_update_failed", err?.Description ?? "Could not revoke the role.");
        }

        log.LogInformation("Admin {ActorId} revoked role {Role} from user {UserId}", actorId, role, userId);
        return Result<bool>.Ok(true);
    }
}
