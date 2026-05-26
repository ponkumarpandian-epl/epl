using Microsoft.AspNetCore.Identity;

namespace Epl.Domain.Entities;

public class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// URL to the user's profile picture. Today: served by the API from local
    /// storage (<c>/api/profile/avatar/{userId}</c>). Tomorrow: Azure Blob URL.
    /// Null = use the initials avatar.
    /// </summary>
    public string? AvatarUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Team>          CaptainedTeams { get; set; } = new List<Team>();
    public ICollection<UserGameSkill> Skills         { get; set; } = new List<UserGameSkill>();
}
