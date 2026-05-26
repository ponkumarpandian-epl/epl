namespace Epl.Application.Auth.Dtos;

public record MeResponse(
    Guid Id,
    string? Email,
    string? PhoneNumber,
    string FullName,
    string? AvatarUrl,
    IReadOnlyList<string> Roles);
