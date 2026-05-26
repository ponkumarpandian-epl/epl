namespace Epl.Application.Authorization;

public static class AuthorizationPolicies
{
    public const string AdminOnly     = "AdminOnly";
    public const string PlayerOrAdmin = "PlayerOrAdmin";
    public const string UmpireOrAdmin = "UmpireOrAdmin";
}
