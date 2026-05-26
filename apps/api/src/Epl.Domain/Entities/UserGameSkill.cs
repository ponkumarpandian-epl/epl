namespace Epl.Domain.Entities;

/// <summary>
/// A user's self-declared skill level for a specific Game.
/// Composite key: (UserId, GameId).
/// </summary>
public class UserGameSkill
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;

    public SkillLevel Level { get; set; }

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
