namespace Epl.Domain.Entities;

/// <summary>
/// One format bucket inside a <see cref="Tournament"/> — Singles / Men's Doubles /
/// Women's Doubles / Mixed Doubles. Each category owns its own entry list and (later)
/// its own bracket.
/// </summary>
public class TournamentCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;

    public string Name { get; set; } = string.Empty;     // "Men's Doubles"
    public CategoryFormat Format { get; set; }           // Singles | MD | WD | XD

    /// <summary>1 for Singles, 2 for any Doubles format. Derived but stored for query convenience.</summary>
    public int PlayersPerEntry { get; set; }

    public int MinEntries { get; set; }
    public int MaxEntries { get; set; }

    /// <summary>In rupees. 0 means "inherit Tournament.EntryFeeRupees"; non-zero overrides.</summary>
    public int EntryFeeRupees { get; set; }

    public bool RegistrationOpen { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
