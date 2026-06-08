using Epl.Domain.Entities;

namespace Epl.Application.Brackets.Dtos;

public record BracketParticipantDto(
    Guid    Id,
    string  DisplayName,
    int?    Seed,
    bool    IsBye,
    Guid?   SourceEntryId);

public record BracketMatchDto(
    Guid           Id,
    Guid           RoundId,
    int            SlotIndex,
    Guid?          ParticipantAId,
    Guid?          ParticipantBId,
    Guid?          WinnerParticipantId,
    MatchStatus    Status,
    DateTimeOffset? ScheduledAt,
    string?        Court,
    Guid?          NextMatchId,
    int            RulesBestOf,
    int            RulesPointsToWin,
    int            RulesWinByMargin,
    int?           RulesPointCap);

public record BracketRoundDto(
    Guid Id,
    int  OrderIndex,
    string Name,
    string? GroupLabel,
    IReadOnlyList<BracketMatchDto> Matches);

public record BracketViewDto(
    Guid       Id,
    string     ParentType,
    Guid       ParentId,
    DrawFormat Format,
    bool       IsPublished,
    int        DefaultBestOf,
    int        DefaultPointsToWin,
    int        DefaultWinByMargin,
    int?       DefaultPointCap,
    IReadOnlyList<BracketParticipantDto> Participants,
    IReadOnlyList<BracketRoundDto>       Rounds);

// ── Admin write models ──────────────────────────────────────────────────────

public record CreateBracketRequest(
    /// <summary>Today only "TournamentCategory" is accepted; future: "SeasonGame".</summary>
    string     ParentType,
    Guid       ParentId,
    DrawFormat Format);

public record SeedItem(
    Guid?  ParticipantId,    // optional — when present, updates an existing slot
    Guid?  SourceEntryId,    // FK → TournamentEntry; null for manual "BYE" rows
    string DisplayName,
    int?   Seed,
    bool   IsBye);

public record SeedBracketRequest(IReadOnlyList<SeedItem> Participants);
