namespace Epl.Domain.Entities;

/// <summary>
/// Master table — one row per sport that EPL ever runs (Cricket, Badminton, Volleyball, …).
/// Season-specific data (dates, fees, venue) lives on <see cref="SeasonGame"/>; this row
/// only holds the timeless facts about the sport.
/// </summary>
public class Game
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Display name — "Cricket", "Badminton", "Volleyball".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>URL slug — "cricket", "badminton", "volleyball".</summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>Stable enum kind for fast code-level branching.</summary>
    public Sport Kind { get; set; }

    public string? Description { get; set; }

    /// <summary>Default WhatsApp community link for this sport. Can be overridden per season.</summary>
    public string? WhatsAppGroupUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<SeasonGame> SeasonGames { get; set; } = new List<SeasonGame>();
}
