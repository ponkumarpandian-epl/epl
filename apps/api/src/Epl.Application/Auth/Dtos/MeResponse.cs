namespace Epl.Application.Auth.Dtos;

public record MeResponse(
    Guid Id,
    string? Email,
    string? PhoneNumber,
    string FullName,
    string? AvatarUrl,
    IReadOnlyList<string> Roles,
    // True when the user captains at least one team — drives the "Captain" nav link.
    bool IsCaptain = false);
