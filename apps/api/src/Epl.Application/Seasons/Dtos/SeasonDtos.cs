using Epl.Domain.Entities;

namespace Epl.Application.Seasons.Dtos;

public record ContactDto(string Name, string PhoneDisplay, string PhoneE164);

public record SeasonGameDto(
    Guid           Id,
    Guid           GameId,
    Sport          Sport,
    string         Slug,
    string         Name,
    string?        Description,
    string?        Venue,
    string?        Categories,
    int            EntryFeeRupees,
    DateTimeOffset? StartsOn,
    DateTimeOffset? EndsOn,
    string?        WhatsAppGroupUrl,
    string?        CardImageUrl,
    bool           RegistrationOpen,
    IReadOnlyList<ContactDto> Contacts);

public record SeasonDto(
    Guid             Id,
    string           Name,
    int              Year,
    string           Slug,
    string?          Tagline,
    DateTimeOffset?  StartsOn,
    DateTimeOffset?  EndsOn,
    bool             IsActive,
    bool             RegistrationOpen,
    IReadOnlyList<SeasonGameDto> Games);

// ── Admin create/update ─────────────────────────────────────────────────────
public record CreateSeasonRequest(
    string  Name,
    int     Year,
    string  Slug,
    string? Tagline,
    DateTimeOffset? StartsOn,
    DateTimeOffset? EndsOn,
    bool    SetActive);

public record AddSeasonGameRequest(
    Guid    GameId,
    string? Venue,
    string? Categories,
    int     EntryFeeRupees,
    DateTimeOffset? StartsOn,
    DateTimeOffset? EndsOn,
    string? WhatsAppGroupUrl,
    string? CardImageUrl,
    IReadOnlyList<ContactDto>? Contacts);

public record GameDto(
    Guid    Id,
    string  Name,
    string  Slug,
    Sport   Kind,
    string? Description,
    string? WhatsAppGroupUrl,
    bool    IsActive);

// ── Hero-ticker stats ──────────────────────────────────────────────────────
public record RegistrationStatsDto(
    Guid     SeasonId,
    string   SeasonName,
    bool     MasterRegistrationOpen,
    int      TotalTeams,
    IReadOnlyList<SportRegistrationStatDto> Sports);

public record SportRegistrationStatDto(
    Guid    SeasonGameId,
    Sport   Sport,
    string  Slug,
    string  Name,
    int     TeamCount,
    bool    RegistrationOpen);
