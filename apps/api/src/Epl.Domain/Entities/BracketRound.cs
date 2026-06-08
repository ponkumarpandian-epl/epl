namespace Epl.Domain.Entities;

/// <summary>
/// One round inside a <see cref="Bracket"/>. For SingleElim: "Round of 16", "Quarterfinals",
/// "Semifinals", "Final". For RoundRobin (T-5): "League" + optional knockouts.
///
/// Rule columns are nullable — null = inherit from the parent bracket's Default*.
/// Lets league rounds run best-of-1 while SF/Final stay best-of-3 in the same bracket.
/// </summary>
public class BracketRound
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid    BracketId  { get; set; }
    public Bracket Bracket    { get; set; } = null!;

    /// <summary>Position in the draw — 0 = first round, increments to the final.</summary>
    public int    OrderIndex { get; set; }
    public string Name       { get; set; } = string.Empty;     // "Quarterfinals", "Final"
    public string? GroupLabel { get; set; }                    // optional, used by GroupKnockout (T-5)

    public int?  BestOf      { get; set; }
    public int?  PointsToWin { get; set; }
    public int?  WinByMargin { get; set; }
    /// <summary>-1 sentinel = "explicitly no cap"; null = inherit.</summary>
    public int?  PointCap    { get; set; }
}
