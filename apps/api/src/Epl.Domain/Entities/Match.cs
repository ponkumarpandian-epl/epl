namespace Epl.Domain.Entities;

/// <summary>
/// One match in a <see cref="Bracket"/>. T-3 ships the schema + skeleton; per-game score
/// entry + walkover handling lands in T-4. Schedule (ScheduledAt + Court) is admin-set in T-4.
///
/// Rules columns are a SNAPSHOT — frozen at materialisation so historical results stay
/// coherent even if admin retunes the bracket-level defaults mid-tournament. The future
/// umpire console reads these, not the parent Bracket/Round.
/// </summary>
public class Match
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid    BracketId { get; set; }
    public Bracket Bracket   { get; set; } = null!;

    public Guid         RoundId { get; set; }
    public BracketRound Round   { get; set; } = null!;

    /// <summary>Position within the round, top-to-bottom in the visual draw.</summary>
    public int SlotIndex { get; set; }

    public Guid? ParticipantAId      { get; set; }
    public Guid? ParticipantBId      { get; set; }
    public Guid? WinnerParticipantId { get; set; }

    public MatchStatus Status { get; set; } = MatchStatus.Pending;

    public DateTimeOffset? ScheduledAt { get; set; }
    public string?         Court       { get; set; }

    /// <summary>SingleElim: where the winner advances to.</summary>
    public Guid? NextMatchId { get; set; }

    // ── Rules snapshot (copied from BracketRound/Bracket at creation time) ──
    public int  RulesBestOf      { get; set; }
    public int  RulesPointsToWin { get; set; }
    public int  RulesWinByMargin { get; set; }
    public int? RulesPointCap    { get; set; }
}
