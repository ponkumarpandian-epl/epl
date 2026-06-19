using Epl.Domain.Entities;

namespace Epl.Application.Users.Dtos;

/// <summary>Admin user-console list row. Email/phone are masked (plan/10 §8.4).</summary>
public record AdminUserDto(
    Guid     Id,
    string   FullName,
    string   EmailMasked,
    string   PhoneMasked,
    string[] Roles);

/// <summary>A team the user captains — shown on the admin user-detail panel (§8.5).</summary>
public record CaptainedTeamSummary(
    Guid    TeamId,
    string  TeamName,
    Sport   Sport,
    string? SeasonLabel);

public record AdminUserDetailDto(
    Guid     Id,
    string   FullName,
    string   EmailMasked,
    string   PhoneMasked,
    string[] Roles,
    IReadOnlyList<CaptainedTeamSummary> CaptainedTeams);

public record GrantRoleRequest(string Role);
