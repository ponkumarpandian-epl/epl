namespace Epl.Domain.Entities;

/// <summary>
/// One roster row per (Team, Player). The captain is the row with <see cref="IsCaptain"/> = true;
/// at most one such row per Team. New rows land as <see cref="TeamMemberStatus.Active"/> immediately —
/// captain adds → player is on the team; the player's escape hatch is the "leave team" action which
/// flips the row to <see cref="TeamMemberStatus.Removed"/>.
/// </summary>
public class TeamMember
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public bool IsCaptain { get; set; }

    public TeamMemberStatus Status { get; set; } = TeamMemberStatus.Active;

    public string? ShirtNumber { get; set; }
    public string? Position    { get; set; }

    /// <summary>Usually equals the team captain's user id; could be Admin during overrides.</summary>
    public Guid AddedByUserId { get; set; }

    public DateTimeOffset AddedAt   { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RemovedAt { get; set; }
}
