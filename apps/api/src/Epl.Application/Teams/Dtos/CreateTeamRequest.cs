using Epl.Domain.Entities;

namespace Epl.Application.Teams.Dtos;

public record CreateTeamRequest(
    /// <summary>
    /// Which season-game the team is registering for. Resolved server-side from
    /// either the explicit id or the sport slug + active season.
    /// </summary>
    Guid?  SeasonGameId,
    Sport  Sport,
    string ApartmentName,
    string TeamName,
    string CaptainName,
    string CaptainMobile,
    double ApartmentLat,
    double ApartmentLng,
    string ApartmentAddress);
