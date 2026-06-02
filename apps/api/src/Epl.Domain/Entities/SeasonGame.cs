namespace Epl.Domain.Entities;

/// <summary>
/// A specific sport running in a specific season — the registration target.
/// Holds season-specific overrides (dates, venue, fee, coordinators, WhatsApp link).
/// </summary>
public class SeasonGame
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SeasonId { get; set; }
    public Season Season { get; set; } = null!;

    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;

    public DateTimeOffset? StartsOn { get; set; }
    public DateTimeOffset? EndsOn   { get; set; }

    public string? Venue { get; set; }                       // "JMR Cricket Ground, EC Phase 1"
    public string? Categories { get; set; }                  // "Men's", "Men's & Women's Doubles"

    /// <summary>In rupees. Stored as int to avoid decimal/float oddities.</summary>
    public int EntryFeeRupees { get; set; }

    /// <summary>Optional override of <see cref="Entities.Game.WhatsAppGroupUrl"/> for this season's run of this sport.</summary>
    public string? WhatsAppGroupUrl { get; set; }

    /// <summary>Image displayed on the home page sport-card. Falls back to a deterministic per-sport default.</summary>
    public string? CardImageUrl { get; set; }

    // ── Rules-page facts ────────────────────────────────────────────────
    // Surface on the public Rules page (and any other "at a glance" UI).
    // Each field is optional; the UI hides the corresponding fact card
    // when the value is null/empty.

    /// <summary>External registration URL (e.g. a tinyurl form). Shown on the rules page facts strip.</summary>
    public string? RegistrationUrl { get; set; }

    /// <summary>Marketing hashtag — "#BeyondBoundaries", "#BattleofBaddies". Renders in the eyebrow above the sport name.</summary>
    public string? Hashtag { get; set; }

    /// <summary>One-line note about reporting time, e.g. "6:00 AM". Free text so different sports can use different formats.</summary>
    public string? ReportingTime { get; set; }

    /// <summary>Separate from <see cref="RegistrationOpen"/> — the date the registration closes; informational.</summary>
    public DateTimeOffset? RegistrationDeadline { get; set; }

    /// <summary>One-line format summary — "Red tennis ball", "5 doubles per team", "6-a-side, no libero".</summary>
    public string? FormatNote { get; set; }

    /// <summary>One-line squad / roster note — "Up to 15 players", "10–13 incl. 3 backups", "12 in squad".</summary>
    public string? SquadNote { get; set; }

    public bool RegistrationOpen { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Sport coordinators — stored as a JSON array column.</summary>
    public List<SeasonGameContact> Contacts { get; set; } = new();

    public ICollection<Team> Teams { get; set; } = new List<Team>();
}
