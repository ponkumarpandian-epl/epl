using Epl.Domain.Entities;

namespace Epl.Application.Teams.Dtos;

/// <summary>A team card on the captain dashboard (plan/10 §4.1).</summary>
public record CaptainTeamDto(
    Guid    Id,
    Sport   Sport,
    string  Name,
    string  ApartmentName,
    string? SeasonName,
    int     ActiveMemberCount,
    int     MaxRosterSize);

/// <summary>One Active roster row. Mobile is masked; full PII is never returned.</summary>
public record TeamMemberDto(
    Guid    Id,
    Guid    UserId,
    string  FullName,
    string? AvatarUrl,
    string  PhoneMasked,
    bool    IsCaptain,
    string? ShirtNumber,
    string? Position,
    DateTimeOffset AddedAt);

/// <summary>Team header + Active roster (plan/10 §3.1 GET members, §4.2 manage).</summary>
public record TeamRosterDto(
    Guid    TeamId,
    Sport   Sport,
    string  Name,
    string  ApartmentName,
    string? SeasonName,
    Guid?   CaptainUserId,
    int     MaxRosterSize,
    IReadOnlyList<TeamMemberDto> Members);

/// <summary>A team the signed-in player is an Active member of (plan/10 §4.3).</summary>
public record MyTeamDto(
    Guid    MembershipId,
    Guid    TeamId,
    Sport   Sport,
    string  Name,
    string  ApartmentName,
    string? SeasonName,
    string  CaptainName,
    bool    IsCaptain,
    string? ShirtNumber,
    string? Position);

/// <summary>A recent roster change for the captain's audit strip (plan/10 §4.2, C-7).</summary>
public record RosterChangeDto(
    Guid    UserId,
    string  FullName,
    bool    IsCaptain,
    string  Action,            // "added" | "removed"
    DateTimeOffset At);

public record AddTeamMemberRequest(Guid UserId, string? ShirtNumber, string? Position);

public record UpdateTeamMemberRequest(string? ShirtNumber, string? Position);

public record TransferCaptaincyRequest(Guid NewCaptainUserId);
