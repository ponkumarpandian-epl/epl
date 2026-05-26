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

    public bool RegistrationOpen { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Sport coordinators — stored as a JSON array column.</summary>
    public List<SeasonGameContact> Contacts { get; set; } = new();

    public ICollection<Team> Teams { get; set; } = new List<Team>();
}
