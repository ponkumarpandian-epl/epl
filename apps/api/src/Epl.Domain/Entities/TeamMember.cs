namespace Epl.Domain.Entities;

/// <summary>
/// One roster row per (Team, User). A player is "on a team" when an Active row
/// exists. Removed rows are kept as history (audit + the ability to re-add).
/// Exactly one Active row per team carries <see cref="IsCaptain"/> = true.
/// </summary>
public class TeamMember
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    /// <summary>Exactly one true per team. The captain's roster row.</summary>
    public bool IsCaptain { get; set; }

    public TeamMemberStatus Status { get; set; } = TeamMemberStatus.Active;

    /// <summary>Optional — cricket "11", badminton usually blank.</summary>
    public string? ShirtNumber { get; set; }

    /// <summary>Optional — "Wicket-keeper", "Smash".</summary>
    public string? Position { get; set; }

    /// <summary>Who added this row — usually the captain, or an admin on override.</summary>
    public Guid AddedByUserId { get; set; }

    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Set when <see cref="Status"/> flips to Removed; cleared on re-add.</summary>
    public DateTimeOffset? RemovedAt { get; set; }
}

public enum TeamMemberStatus
{
    Active  = 1,
    Removed = 2,
}
