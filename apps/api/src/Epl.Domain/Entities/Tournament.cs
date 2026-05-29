namespace Epl.Domain.Entities;

/// <summary>
/// A stand-alone tournament that runs outside the EPL annual season — e.g. a one-off
/// badminton open held over a weekend. Peer concept to <see cref="Season"/> but more
/// lightweight: scoped to a single <see cref="Game"/>, broken into
/// <see cref="TournamentCategory"/> rows per format (Singles / MD / WD / XD).
/// </summary>
public class Tournament
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;

    public string Name { get; set; } = string.Empty;     // "Smashify Open · March 2026"
    public string Slug { get; set; } = string.Empty;     // "smashify-open-mar-2026" — unique

    public string? Tagline     { get; set; }
    public string? Description { get; set; }
    public string? Venue       { get; set; }

    public DateTimeOffset? StartsOn             { get; set; }
    public DateTimeOffset? EndsOn               { get; set; }
    public DateTimeOffset? RegistrationDeadline { get; set; }

    public string? BannerImageUrl   { get; set; }
    public string? WhatsAppGroupUrl { get; set; }

    /// <summary>In rupees. 0 = free.</summary>
    public int EntryFeeRupees { get; set; }

    /// <summary>Master switch — closes all categories regardless of their own flag.</summary>
    public bool RegistrationOpen { get; set; } = true;

    /// <summary>Admin draft gate — hidden from public listings while false.</summary>
    public bool IsPublished { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Coordinator phone contacts — JSON column.</summary>
    public List<TournamentContact> Contacts { get; set; } = new();

    public ICollection<TournamentCategory> Categories { get; set; } = new List<TournamentCategory>();
}
