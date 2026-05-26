namespace Epl.Domain.Entities;

/// <summary>
/// A tournament season — "Season 1", "Season 2", …
/// Admin creates a Season then adds <see cref="SeasonGame"/> rows to attach sports to it.
/// Exactly one season can be <see cref="IsActive"/> at a time; the public home page reads from it.
/// </summary>
public class Season
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;       // "Season 2"
    public int Year { get; set; }                          // 2026
    public string Slug { get; set; } = string.Empty;       // "season-2"
    public string? Tagline { get; set; }                   // optional marketing copy

    public DateTimeOffset? StartsOn { get; set; }
    public DateTimeOffset? EndsOn   { get; set; }

    public bool IsActive { get; set; }                     // exactly one active at a time
    public bool RegistrationOpen { get; set; } = true;     // master switch — all SeasonGames in this season inherit

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<SeasonGame> Games { get; set; } = new List<SeasonGame>();
}
