namespace Epl.Domain.Entities;

/// <summary>
/// Admin-managed lifecycle for a registered team.
///
/// Default for new + existing rows is <see cref="Active"/>. Admins can move a team to
/// <see cref="Withdrawn"/> (no longer competing) or <see cref="Waitlist"/> (held in
/// reserve until capacity opens up). Only <see cref="Active"/> teams appear on the
/// public listing.
/// </summary>
public enum TeamStatus
{
    Active    = 1,
    Withdrawn = 2,
    Waitlist  = 3,
}
