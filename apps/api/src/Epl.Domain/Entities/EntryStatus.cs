namespace Epl.Domain.Entities;

/// <summary>
/// Lifecycle of a <see cref="TournamentEntry"/>.
/// </summary>
public enum EntryStatus
{
    /// <summary>Player submitted the form; admin hasn't confirmed yet (anonymous entries land here by default).</summary>
    Pending   = 1,

    /// <summary>Admin confirmed — entry counts toward the draw.</summary>
    Confirmed = 2,

    /// <summary>Player withdrew or admin rejected — no longer counts, but kept for audit.</summary>
    Withdrawn = 3,
}
