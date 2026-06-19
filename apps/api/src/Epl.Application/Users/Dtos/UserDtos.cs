namespace Epl.Application.Users.Dtos;

/// <summary>
/// A user-search hit shown to a captain (plan/10 §3.3). Carries only what's needed
/// to disambiguate — never the full mobile or email.
/// </summary>
public record UserSearchResultDto(
    Guid    Id,
    string  FullName,
    string  PhoneMasked,
    string? AvatarUrl);
