namespace Epl.Domain.Entities;

public class Team
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Canonical link to the season-game the team registered for. Drives reporting,
    /// fees, dates, etc. Existing pre-migration rows may still have NULL here.
    /// </summary>
    public Guid? SeasonGameId { get; set; }
    public SeasonGame? SeasonGame { get; set; }

    /// <summary>Denormalised — equals <c>SeasonGame.Game.Kind</c>. Kept for fast filtering.</summary>
    public Sport Sport { get; set; }

    public string Name { get; set; } = string.Empty;

    public Guid ApartmentId { get; set; }
    public Apartment Apartment { get; set; } = null!;

    public string CaptainName { get; set; } = string.Empty;
    public string CaptainMobile { get; set; } = string.Empty;

    // Anonymous registration is allowed — these are null when the form was
    // submitted without a signed-in user.
    public Guid? CreatedByUserId { get; set; }
    public AppUser? CreatedBy { get; set; }

    /// <summary>
    /// Real FK to the captain's <see cref="AppUser"/>. Nullable while the backfill from
    /// CaptainMobile → AppUser.PhoneNumber runs, and for legacy rows the registrant of which
    /// hasn't signed up yet. Drives the TeamCaptainOrAdmin authorization policy.
    /// </summary>
    public Guid? CaptainUserId { get; set; }
    public AppUser? Captain { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
}
