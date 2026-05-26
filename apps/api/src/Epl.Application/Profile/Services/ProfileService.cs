using Epl.Application.Profile.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Profile.Services;

public class ProfileService(
    UserManager<AppUser>    users,
    IUnitOfWork             uow,
    IProfileImageStore      images,
    ILogger<ProfileService> log) : IProfileService
{
    public async Task<ProfileResponse?> GetAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return null;

        var roles = await users.GetRolesAsync(user);
        var skills = await uow.UserSkills.ListByUserAsync(userId, ct);

        return new ProfileResponse(
            Id:          user.Id,
            FullName:    user.FullName,
            Email:       user.Email,
            PhoneNumber: user.PhoneNumber,
            AvatarUrl:   user.AvatarUrl,
            Roles:       roles.ToArray(),
            Skills:      skills
                            .Select(s => new ProfileSkillDto(s.GameId, s.Game.Name, s.Game.Slug, s.Level))
                            .ToList());
    }

    public async Task<Result<ProfileResponse>> UpdateSkillsAsync(Guid userId, UpdateSkillsRequest req, CancellationToken ct = default)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return Result<ProfileResponse>.Fail("user_not_found", "User not found.");

        // Validate every GameId resolves to a real master game.
        var allGames     = await uow.Games.ListAsync(ct);
        var gameIdLookup = allGames.ToDictionary(g => g.Id);
        foreach (var s in req.Skills)
        {
            if (!gameIdLookup.ContainsKey(s.GameId))
                return Result<ProfileResponse>.Fail("invalid_game", $"Game {s.GameId} does not exist.");
            if (!Enum.IsDefined(typeof(SkillLevel), s.Level))
                return Result<ProfileResponse>.Fail("invalid_level", $"Skill level {s.Level} is not valid.");
        }

        // Upsert: load existing tracked rows, update or add.
        var existing = await uow.UserSkills.ListByUserForUpdateAsync(userId, ct);
        var byGame   = existing.ToDictionary(s => s.GameId);

        foreach (var input in req.Skills)
        {
            if (byGame.TryGetValue(input.GameId, out var row))
            {
                row.Level     = input.Level;
                row.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                uow.UserSkills.Add(new UserGameSkill
                {
                    UserId    = userId,
                    GameId    = input.GameId,
                    Level     = input.Level,
                    UpdatedAt = DateTimeOffset.UtcNow,
                });
            }
        }

        var rows = await uow.SaveChangesAsync(ct);
        log.LogInformation("Updated {Count} skills for user {UserId} ({Rows} rows)", req.Skills.Count, userId, rows);

        var refreshed = await GetAsync(userId, ct);
        return Result<ProfileResponse>.Ok(refreshed!);
    }

    public async Task<Result<string>> UploadAvatarAsync(
        Guid userId, Stream content, string contentType, string fileName, CancellationToken ct = default)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null) return Result<string>.Fail("user_not_found", "User not found.");

        var ext = ResolveExtension(contentType, fileName);
        if (ext is null) return Result<string>.Fail("unsupported_image",
            "Upload a JPG, PNG, GIF or WebP image (max ~4 MB).");

        var url = await images.SaveAsync(userId, content, ext, ct);

        user.AvatarUrl = url;
        var update = await users.UpdateAsync(user);
        if (!update.Succeeded)
        {
            var err = update.Errors.FirstOrDefault();
            return Result<string>.Fail(err?.Code ?? "update_failed", err?.Description ?? "Could not save avatar.");
        }

        log.LogInformation("User {UserId} uploaded a new avatar → {Url}", userId, url);
        return Result<string>.Ok(url);
    }

    public Task<(Stream? Stream, string? ContentType)> OpenAvatarAsync(Guid userId, CancellationToken ct = default)
        => images.OpenAsync(userId, ct);

    private static string? ResolveExtension(string? contentType, string fileName)
    {
        var ext = (contentType ?? "").ToLowerInvariant() switch
        {
            "image/jpeg" or "image/jpg" => "jpg",
            "image/png"                  => "png",
            "image/gif"                  => "gif",
            "image/webp"                 => "webp",
            _                            => null,
        };
        if (ext is not null) return ext;

        // fall back to the file-name extension if content-type is missing
        var fromName = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        return fromName switch
        {
            "jpg" or "jpeg" => "jpg",
            "png"           => "png",
            "gif"           => "gif",
            "webp"          => "webp",
            _               => null,
        };
    }
}
