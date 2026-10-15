namespace Epl.Application.Authorization;

public static class AuthorizationPolicies
{
    public const string AdminOnly     = "AdminOnly";
    public const string PlayerOrAdmin = "PlayerOrAdmin";
    public const string UmpireOrAdmin = "UmpireOrAdmin";

    /// <summary>
    /// Gate for captain-scoped roster endpoints. The policy only requires an
    /// authenticated user; the per-team captain check is resource-scoped and runs
    /// in the service (needs the route's teamId) — see plan/10 §3.5.
    /// </summary>
    public const string TeamCaptainOrAdmin = "TeamCaptainOrAdmin";
}
