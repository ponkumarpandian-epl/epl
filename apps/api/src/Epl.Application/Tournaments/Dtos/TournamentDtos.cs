using Epl.Domain.Entities;

namespace Epl.Application.Tournaments.Dtos;

public record TournamentContactDto(string Name, string PhoneDisplay, string PhoneE164);

/// <summary>
/// Lifecycle the public hub uses to colour-code cards and pick the right CTA.
/// Derived server-side from dates + flags so the client never has to compute it.
/// </summary>
public enum TournamentStatus
{
    Draft       = 0,   // IsPublished = false
    Upcoming    = 1,   // published, StartsOn in future
    Open        = 2,   // published, RegistrationOpen = true, deadline not passed
    InProgress  = 3,   // published, StartsOn <= now <= EndsOn
    Completed   = 4,   // published, EndsOn in past
}

public record TournamentCategoryDto(
    Guid           Id,
    string         Name,
    CategoryFormat Format,
    int            PlayersPerEntry,
    int            MinEntries,
    int            MaxEntries,
    int            EntryFeeRupees,
    bool           RegistrationOpen,
    /// <summary>Total non-withdrawn entries. 0 unless the caller asks for rolled-up counts.</summary>
    int            TotalEntries     = 0,
    /// <summary>Subset of TotalEntries that are status=Confirmed.</summary>
    int            ConfirmedEntries = 0);

public record TournamentSummaryDto(
    Guid             Id,
    string           Slug,
    string           Name,
    Guid             GameId,
    string           GameName,
    string?          Venue,
    DateTimeOffset?  StartsOn,
    DateTimeOffset?  EndsOn,
    DateTimeOffset?  RegistrationDeadline,
    string?          BannerImageUrl,
    int              EntryFeeRupees,
    bool             RegistrationOpen,
    bool             IsPublished,
    TournamentStatus Status,
    int              CategoryCount,
    IReadOnlyList<TournamentCategoryDto> Categories);

public record TournamentDetailDto(
    Guid             Id,
    string           Slug,
    string           Name,
    Guid             GameId,
    string           GameName,
    string?          Tagline,
    string?          Description,
    string?          Venue,
    DateTimeOffset?  StartsOn,
    DateTimeOffset?  EndsOn,
    DateTimeOffset?  RegistrationDeadline,
    string?          BannerImageUrl,
    string?          WhatsAppGroupUrl,
    int              EntryFeeRupees,
    bool             RegistrationOpen,
    bool             IsPublished,
    TournamentStatus Status,
    IReadOnlyList<TournamentCategoryDto>  Categories,
    IReadOnlyList<TournamentContactDto>   Contacts);

// ── Admin write models ─────────────────────────────────────────────────────

public record CreateTournamentRequest(
    string          Name,
    string          Slug,
    Guid            GameId,
    string?         Tagline,
    string?         Description,
    string?         Venue,
    DateTimeOffset? StartsOn,
    DateTimeOffset? EndsOn,
    DateTimeOffset? RegistrationDeadline,
    string?         BannerImageUrl,
    string?         WhatsAppGroupUrl,
    int             EntryFeeRupees,
    bool            RegistrationOpen,
    bool            Publish,
    IReadOnlyList<TournamentContactDto>?    Contacts,
    IReadOnlyList<UpsertTournamentCategoryRequest>? Categories);

public record UpdateTournamentRequest(
    string?         Name,
    string?         Tagline,
    string?         Description,
    string?         Venue,
    DateTimeOffset? StartsOn,
    DateTimeOffset? EndsOn,
    DateTimeOffset? RegistrationDeadline,
    string?         BannerImageUrl,
    string?         WhatsAppGroupUrl,
    int?            EntryFeeRupees,
    bool?           RegistrationOpen,
    IReadOnlyList<TournamentContactDto>? Contacts);

public record UpsertTournamentCategoryRequest(
    Guid?          Id,                // null = create; non-null = update existing
    string         Name,
    CategoryFormat Format,
    int            MinEntries,
    int            MaxEntries,
    int            EntryFeeRupees,
    bool           RegistrationOpen);
