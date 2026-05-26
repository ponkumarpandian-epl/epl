using System.Text.RegularExpressions;

namespace Epl.Application.Auth.Common;

public enum IdentifierKind { Email, Mobile, Invalid }

public static partial class IdentifierParser
{
    private static readonly Regex Email = MyEmailRegex();
    private static readonly Regex Mobile = MyMobileRegex();

    public static IdentifierKind Detect(string identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier)) return IdentifierKind.Invalid;
        var s = identifier.Trim();
        if (Email.IsMatch(s))  return IdentifierKind.Email;
        if (Mobile.IsMatch(s)) return IdentifierKind.Mobile;
        return IdentifierKind.Invalid;
    }

    public static string ToE164Mobile(string indianMobile) => "+91" + indianMobile.Trim();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$",         RegexOptions.Compiled)] private static partial Regex MyEmailRegex();
    [GeneratedRegex(@"^[6-9]\d{9}$",                        RegexOptions.Compiled)] private static partial Regex MyMobileRegex();
}
