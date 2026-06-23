using System.Security.Claims;
using Epl.Application.Auth.Common;
using Epl.Application.Auth.Dtos;
using Epl.Application.Common.Caching;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Auth.Services;

public class AuthService(
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
    IUnitOfWork uow,
    ICacheStore cache,
    ILogger<AuthService> log) : IAuthService
{
    public async Task<Result<MeResponse>> RegisterAsync(RegisterRequest req, CancellationToken ct = default)
    {
        var kind = IdentifierParser.Detect(req.Identifier);
        if (kind == IdentifierKind.Invalid)
            return Result<MeResponse>.Fail("invalid_identifier", "Identifier must be a valid email or 10-digit Indian mobile.");

        var user = new AppUser
        {
            FullName = req.FullName.Trim(),
        };

        if (kind == IdentifierKind.Email)
        {
            user.Email    = req.Identifier.Trim().ToLowerInvariant();
            user.UserName = user.Email;
        }
        else
        {
            var mobile = IdentifierParser.ToE164Mobile(req.Identifier);
            user.PhoneNumber = mobile;
            user.UserName    = mobile;
        }

        var create = await users.CreateAsync(user, req.Password);
        if (!create.Succeeded)
        {
            var err = create.Errors.FirstOrDefault();
            log.LogWarning("Register failed for {Identifier}: {Code} {Description}", req.Identifier, err?.Code, err?.Description);
            return Result<MeResponse>.Fail(err?.Code ?? "register_failed", err?.Description ?? "Registration failed.");
        }

        await users.AddToRoleAsync(user, Roles.Player);

        if (kind == IdentifierKind.Mobile)
            await LinkPlaceholdersAsync(user, ct);

        // Sign the new user in immediately — they land on the home page logged in.
        await signIn.SignInAsync(user, isPersistent: true);

        log.LogInformation("Registered user {UserId} ({Kind}) -> role Player", user.Id, kind);

        var me = await ToMeAsync(user);
        return Result<MeResponse>.Ok(me);
    }

    public async Task<MeResponse?> GetMeAsync(ClaimsPrincipal principal, CancellationToken ct = default)
    {
        var user = await users.GetUserAsync(principal);
        return user is null ? null : await ToMeAsync(user);
    }

    private async Task<MeResponse> ToMeAsync(AppUser u)
    {
        var roles     = await users.GetRolesAsync(u);
        var isCaptain = await uow.Teams.AnyAsync(t => t.CaptainUserId == u.Id);
        return new MeResponse(u.Id, u.Email, u.PhoneNumber, u.FullName, u.AvatarUrl, roles.ToArray(), isCaptain);
    }

    private async Task LinkPlaceholdersAsync(AppUser user, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.PhoneNumber)) return;

        var placeholders = await uow.TeamMembers.ListActivePlaceholdersByMobileAsync(user.PhoneNumber!, track: true, ct);
        if (placeholders.Count == 0) return;

        var claimedSeasonGames = new HashSet<Guid>();
        var linked = 0;

        foreach (var ph in placeholders)
        {
            var sgId = ph.Team.SeasonGameId;

            // C8: one active membership per SeasonGame. Guard against existing rows AND
            // against linking two placeholders that share a SeasonGame in this same batch.
            if (sgId.HasValue)
            {
                if (claimedSeasonGames.Contains(sgId.Value)) continue;
                if (await uow.TeamMembers.ExistsActiveInSameSeasonGameAsync(user.Id, sgId.Value, ph.TeamId, ct))
                    continue;
                claimedSeasonGames.Add(sgId.Value);
            }

            ph.UserId                = user.Id;
            ph.PlaceholderName       = null;
            ph.PlaceholderMobile     = null;
            ph.LinkedFromPlaceholder = true;
            ph.AcknowledgedAt        = null;
            linked++;
            log.LogInformation("Linked placeholder {MemberId} on team {TeamId} to new user {UserId}",
                ph.Id, ph.TeamId, user.Id);
        }

        if (linked > 0)
        {
            await uow.SaveChangesAsync(ct);
            cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix);
        }
    }
}
