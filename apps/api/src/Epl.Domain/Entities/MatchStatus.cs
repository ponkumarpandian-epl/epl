namespace Epl.Domain.Entities;

/// <summary>
/// Lifecycle of a single <see cref="Match"/> inside a bracket.
/// Created Pending; admin moves it forward as games happen.
/// </summary>
public enum MatchStatus
{
    Pending    = 1,   // both participants known but match not yet started
    Scheduled  = 2,   // ScheduledAt + Court set
    InProgress = 3,   // first point scored (umpire console / live scoring)
    Complete   = 4,   // result recorded; WinnerParticipantId set
    Walkover   = 5,   // one side didn't show; WinnerParticipantId still set
}
