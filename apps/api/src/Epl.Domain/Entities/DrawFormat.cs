namespace Epl.Domain.Entities;

/// <summary>
/// Bracket draw format. T-3 ships SingleElimination only — RoundRobin and GroupKnockout
/// land in T-5. Values are explicit so the wire format stays stable across iterations.
/// </summary>
public enum DrawFormat
{
    SingleElimination = 1,
    RoundRobin        = 2,
    GroupKnockout     = 3,
}
