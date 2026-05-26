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
    DateTimeOffset CreatedAt);

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
