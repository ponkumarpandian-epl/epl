using Epl.Domain.Entities;

namespace Epl.Application.Teams.Dtos;

public record TeamResponse(
    Guid    Id,
    Sport   Sport,
    string  Name,
    string  ApartmentName,
    string  ApartmentAddress,
    double  ApartmentLat,
    double  ApartmentLng,
    string  CaptainName,
    string  CaptainMobile,
    Guid?   SeasonGameId,
    string? SeasonName,
    DateTimeOffset CreatedAt,
    // Payment fields. Populated only on admin endpoints (GET /api/teams,
    // /api/teams/{id}); the public CreateTeam response never reads from these
    // because new registrations start with PaymentCompleted = false / PaidTo = null.
    bool             PaymentCompleted = false,
    string?          PaidTo           = null,
    DateTimeOffset?  PaidAt           = null,
    // Admin-managed status + free-text reason. Both default to Active / null
    // for legacy callers that don't know about the new fields yet.
    TeamStatus       Status           = TeamStatus.Active,
    string?          StatusComment    = null);

public record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize);

public record TeamListQuery(
    Sport?       Sport,
    string?      Search,
    Guid?        SeasonId,
    TeamStatus?  Status,
    int          Page     = 1,
    int          PageSize = 20);

/// <summary>
/// Public listing item — the three fields visible to every visitor:
/// team name, apartment name, captain name. No mobile, no payment.
/// </summary>
public record TeamPublicSummaryDto(
    Guid    Id,
    Sport   Sport,
    string  Name,
    string  ApartmentName,
    string  CaptainName);

/// <summary>Admin write — change a team's lifecycle status with an optional note.</summary>
public record SetTeamStatusRequest(TeamStatus Status, string? Comment);
