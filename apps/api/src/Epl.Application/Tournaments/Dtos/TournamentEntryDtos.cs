using Epl.Domain.Entities;

namespace Epl.Application.Tournaments.Dtos;

/// <summary>
/// Public-facing view of a single registered entry. Mobile numbers are NOT included
/// in this DTO — admin endpoints use <see cref="AdminTournamentEntryDto"/> instead.
/// </summary>
public record TournamentEntryDto(
    Guid           Id,
    Guid           TournamentCategoryId,
    string         Player1Name,
    string?        Player2Name,
    string?        TeamLabel,
    int?           Seed,
    EntryStatus    Status,
    DateTimeOffset CreatedAt);

/// <summary>
/// Admin view — includes mobile + user-id slots so admins can contact players
/// and reconcile against accounts.
/// </summary>
public record AdminTournamentEntryDto(
    Guid           Id,
    Guid           TournamentCategoryId,
    string         Player1Name,
    string         Player1Mobile,
    Guid?          Player1UserId,
    string?        Player2Name,
    string?        Player2Mobile,
    Guid?          Player2UserId,
    string?        TeamLabel,
    int?           Seed,
    EntryStatus    Status,
    DateTimeOffset CreatedAt);

/// <summary>
/// Per-category counter rolled up for the public detail page and admin entries tab.
/// </summary>
public record TournamentCategoryCountsDto(
    Guid CategoryId,
    int  TotalEntries,
    int  ConfirmedEntries);

// ── Write models ────────────────────────────────────────────────────────────

public record RegisterTournamentEntryRequest(
    string  Player1Name,
    string  Player1Mobile,
    string? Player2Name,
    string? Player2Mobile,
    string? TeamLabel);

public record UpdateEntrySeedRequest(int? Seed);

public record UpdateEntryStatusRequest(EntryStatus Status);
