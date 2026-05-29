namespace Epl.Domain.Entities;

/// <summary>
/// Lifecycle state of a <see cref="TeamMember"/> row. The captain adds a player → row lands
/// as <see cref="Active"/> immediately (no invite step). If the player decides to leave, the
/// row flips to <see cref="Removed"/> — soft-delete, kept for audit and to allow re-adding.
/// </summary>
public enum TeamMemberStatus
{
    Active  = 1,
    Removed = 2,
}
