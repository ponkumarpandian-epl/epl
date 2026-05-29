namespace Epl.Domain.Entities;

/// <summary>
/// Format of a <see cref="TournamentCategory"/> — drives the registration shape (1 vs 2 player slots)
/// and the default draw type the bracket builder offers.
/// </summary>
public enum CategoryFormat
{
    Singles       = 1,
    MensDoubles   = 2,
    WomensDoubles = 3,
    MixedDoubles  = 4,
}
