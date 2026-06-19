using Epl.Domain.Entities;

namespace Epl.Application.Common;

/// <summary>Shared helpers for roster sizing and PII masking (plan/10 §3, §4, §8).</summary>
public static class Roster
{
    /// <summary>Hard cap on roster size regardless of per-SeasonGame config (decision C4).</summary>
    public const int HardMax = 16;

    /// <summary>
    /// Effective Active-roster cap for a team: the SeasonGame override when set,
    /// otherwise the per-sport default, clamped to [1, <see cref="HardMax"/>].
    /// </summary>
    public static int EffectiveMaxSize(Sport sport, int? configured)
    {
        var fallback = sport switch
        {
            Sport.Cricket    => 12,
            Sport.Badminton  => 4,
            Sport.Volleyball => 8,
            _                => 12,
        };
        return Math.Clamp(configured ?? fallback, 1, HardMax);
    }
}

/// <summary>
/// PII masking for responses. Never return a full phone/email to a captain or the
/// public — only enough to disambiguate (plan/10 §3.3, §8.4).
/// </summary>
public static class Mask
{
    /// <summary>
    /// E.164 phone → "+91 ••••• ••210" (country code + last 3 digits). Empty when blank.
    /// </summary>
    public static string Phone(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "";
        var trimmed = raw.Trim();
        var hasPlus = trimmed.StartsWith('+');
        var digits  = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.Length < 4)
            return (hasPlus ? "+" : "") + new string('•', digits.Length);

        var last3 = digits[^3..];
        if (hasPlus && digits.Length >= 5)
            return $"+{digits[..2]} ••••• ••{last3}";
        return $"••••• ••{last3}";
    }

    /// <summary>"ravi.kumar@gmail.com" → "ra••••@gmail.com". Empty when blank.</summary>
    public static string Email(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "";
        var at = raw.IndexOf('@');
        if (at <= 0) return "••••";
        var name   = raw[..at];
        var domain = raw[at..];
        var keep   = name.Length <= 2 ? name[..1] : name[..2];
        return $"{keep}••••{domain}";
    }
}
