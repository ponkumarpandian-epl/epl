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
    DateTimeOffset?  PaidAt           = null);

public record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize);

public record TeamListQuery(
    Sport?  Sport,
    string? Search,
    Guid?   SeasonId,
    int     Page     = 1,
    int     PageSize = 20);
