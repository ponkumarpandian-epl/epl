namespace Epl.Application.Common.Caching;

/// <summary>
/// Cache key names live here as constants / formatters — single source of truth so reads
/// and invalidations can't disagree about how a key is spelled.
/// Per <c>plan/13-readside-inmemory-cache.md</c> §3.2, keys are lowercase + colon-separated
/// with the family namespace first.
/// </summary>
public static class CacheKeys
{
    // ── Season ──────────────────────────────────────────────────────────────
    /// <summary>The single "currently active" season (with games embedded).</summary>
    public const string SeasonActive = "season:active";
    public static string SeasonById(Guid id) => $"season:{id}";

    // ── Game master ────────────────────────────────────────────────────────
    public const string GamesAll = "games:all";

    // ── Teams (public listing, Active only) ───────────────────────────────
    /// <summary>Active teams for one game (by sport slug — "cricket" / "badminton" / "volleyball").</summary>
    public static string TeamsPublicByGameSlug(string slug) => $"teams:public:by-game:{slug}";

    // The "family" prefixes used by RemoveByPrefix. Keep aligned with the keys above.
    public const string SeasonFamilyPrefix = "season:";
    public const string GamesFamilyPrefix  = "games:";
    public const string TeamsFamilyPrefix  = "teams:";
}
