namespace Epl.Domain.Entities;

/// <summary>
/// A draw attached to either a <see cref="TournamentCategory"/> or, later, a
/// <see cref="SeasonGame"/>. Polymorphic by design — <see cref="ParentType"/> + <see cref="ParentId"/>
/// avoid coupling the bracket subsystem to a specific parent table so we can re-use the
/// same code path for EPL Season knockouts and one-off tournaments alike.
/// </summary>
public class Bracket
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Discriminator. Today: "TournamentCategory". Reserved future values: "SeasonGame", "PlayerLadder".</summary>
    public string ParentType { get; set; } = string.Empty;
    public Guid   ParentId   { get; set; }

    public DrawFormat Format { get; set; }

    /// <summary>Hidden from public bracket view while false.</summary>
    public bool IsPublished { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // ── Default scoring rules (D11) — broken out as columns so they're queryable. ──
    // Inherited by rounds that don't override. Cascade onto Match.Rules* at materialisation time.
    public int  DefaultBestOf      { get; set; } = 3;    // best-of-N games
    public int  DefaultPointsToWin { get; set; } = 21;   // standard BWF
    public int  DefaultWinByMargin { get; set; } = 2;    // deuce, win by 2
    public int? DefaultPointCap    { get; set; } = 30;   // golden point cap; null = no cap

    public ICollection<BracketParticipant> Participants { get; set; } = new List<BracketParticipant>();
    public ICollection<BracketRound>       Rounds       { get; set; } = new List<BracketRound>();
    public ICollection<Match>              Matches      { get; set; } = new List<Match>();
}
