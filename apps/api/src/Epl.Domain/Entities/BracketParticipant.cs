namespace Epl.Domain.Entities;

/// <summary>
/// A slot in the bracket. Source-agnostic: a participant can come from a tournament
/// <see cref="TournamentEntry"/> or, later, an EPL <see cref="Team"/>. Display name is
/// denormalised so the bracket renders without joining back to the source.
/// </summary>
public class BracketParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid    BracketId { get; set; }
    public Bracket Bracket   { get; set; } = null!;

    /// <summary>"Anand / Pradeep", "Smashers", or "BYE" for a bye slot.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>1 = top seed. Null = unseeded (drawn into a random slot).</summary>
    public int? Seed { get; set; }

    /// <summary>FK → TournamentEntry when the bracket parent is a TournamentCategory.</summary>
    public Guid? SourceEntryId { get; set; }
    /// <summary>FK → Team when the bracket parent is a SeasonGame (future).</summary>
    public Guid? SourceTeamId  { get; set; }

    public bool IsBye { get; set; }
}
