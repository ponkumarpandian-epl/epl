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

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Payment tracking — admin-only fields. Captains never see these.
    // PaidTo holds the name of the organiser who collected (e.g. "Christo").
    // PaidAt is set when PaymentCompleted flips true; cleared on flip back.
    public bool             PaymentCompleted { get; set; }
    public string?          PaidTo           { get; set; }
    public DateTimeOffset?  PaidAt           { get; set; }

    // Admin-managed status. New rows default to Active; admin can move them to
    // Withdrawn (no longer playing) or Waitlist (held against capacity). Only
    // Active teams appear on the public listing.
    public TeamStatus Status { get; set; } = TeamStatus.Active;

    /// <summary>Optional free-text reason / note paired with a status change.</summary>
    public string? StatusComment { get; set; }
}
