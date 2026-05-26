using System.Security.Claims;
using Epl.Application.Auth.Common;
using Epl.Application.Auth.Dtos;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Auth.Services;

public class AuthService(
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
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
        var roles = await users.GetRolesAsync(u);
        return new MeResponse(u.Id, u.Email, u.PhoneNumber, u.FullName, u.AvatarUrl, roles.ToArray());
    }
}
