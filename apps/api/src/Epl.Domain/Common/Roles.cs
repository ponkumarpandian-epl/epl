namespace Epl.Domain.Common;

public static class Roles
{
    public const string Admin  = "Admin";
    public const string Player = "Player";
    public const string Umpire = "Umpire";

    public static readonly IReadOnlyList<string> All = new[] { Admin, Player, Umpire };
}
