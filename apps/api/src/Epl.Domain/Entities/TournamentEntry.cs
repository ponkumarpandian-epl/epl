namespace Epl.Domain.Entities;

/// <summary>
/// A player (singles) or pair (doubles) registered for a <see cref="TournamentCategory"/>.
/// Player1 is always present. Player2 is null for Singles, required for any Doubles format.
/// Anonymous registrations are allowed — UserId is nullable so a non-logged-in visitor
/// can sign up with just name + mobile.
/// </summary>
public class TournamentEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TournamentCategoryId { get; set; }
    public TournamentCategory TournamentCategory { get; set; } = null!;

    // ── Slot 1 (always present) ─────────────────────────────────────────────
    public string Player1Name   { get; set; } = string.Empty;
    public string Player1Mobile { get; set; } = string.Empty;   // E.164 like "+919XXXXXXXXX"
    public Guid?  Player1UserId { get; set; }                    // FK → AppUser, nullable

    // ── Slot 2 (null for Singles) ───────────────────────────────────────────
    public string? Player2Name   { get; set; }
    public string? Player2Mobile { get; set; }
    public Guid?   Player2UserId { get; set; }

    /// <summary>Optional display name shown on the bracket — e.g. "Smashers", "Court Kings".</summary>
    public string? TeamLabel { get; set; }

    /// <summary>Admin-assigned seed (1 = best). Null = unseeded.</summary>
    public int? Seed { get; set; }

    public EntryStatus Status { get; set; } = EntryStatus.Pending;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
