using Epl.Application.Common;
using Epl.Application.Common.Caching;
using Epl.Application.Teams.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Teams.Services;

/// <summary>
/// Team roster + captaincy workflow (plan/10). Adds land immediately (decision C5);
/// removals/leaves soft-delete (Status = Removed) so history survives. The captain
/// perimeter is enforced here — every mutating method takes the actor + admin flag.
/// </summary>
public class TeamMemberService(
    IUnitOfWork uow,
    UserManager<AppUser> users,
    ICacheStore cache,
    ILogger<TeamMemberService> log) : ITeamMemberService
{
    public async Task<IReadOnlyList<CaptainTeamDto>> ListCaptainTeamsAsync(Guid captainUserId, CancellationToken ct = default)
    {
        var teams = await uow.Teams.ListByCaptainAsync(captainUserId, ct);
        return teams.Select(t => new CaptainTeamDto(
            t.Id, t.Sport, t.Name, t.Apartment.Name, t.SeasonGame?.Season?.Name,
            t.Members.Count,                          // Active-only via filtered include
            Roster.EffectiveMaxSize(t.Sport, t.SeasonGame?.MaxRosterSize))).ToList();
    }

    public async Task<TeamRosterDto?> GetRosterAsync(Guid teamId, CancellationToken ct = default)
    {
        var t = await uow.Teams.GetWithMembersAsync(teamId, track: false, ct);
        if (t is null) return null;

        var members = t.Members
            .OrderByDescending(m => m.IsCaptain)
            .ThenBy(m => m.User.FullName)
            .Select(m => ToMemberDto(m, m.User))
            .ToList();

        return new TeamRosterDto(
            t.Id, t.Sport, t.Name, t.Apartment.Name, t.SeasonGame?.Season?.Name,
            t.CaptainUserId, Roster.EffectiveMaxSize(t.Sport, t.SeasonGame?.MaxRosterSize), members);
    }

    public async Task<Result<TeamMemberDto>> AddMemberAsync(
        Guid teamId, AddTeamMemberRequest req, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default)
    {
        var team = await uow.Teams.GetWithMembersAsync(teamId, track: false, ct);
        if (team is null) return Result<TeamMemberDto>.Fail("team_not_found", "Team not found.");
        if (!CanManage(team, actorUserId, actorIsAdmin))
            return Result<TeamMemberDto>.Fail("forbidden", "Only the team captain can manage this roster.");

        var user = await users.FindByIdAsync(req.UserId.ToString());
        if (user is null) return Result<TeamMemberDto>.Fail("user_not_found", "That player doesn't have an account yet.");

        if (team.Members.Any(m => m.UserId == req.UserId))
            return Result<TeamMemberDto>.Fail("already_member", $"{user.FullName} is already on this team.");

        if (team.SeasonGameId.HasValue &&
            await uow.TeamMembers.ExistsActiveInSameSeasonGameAsync(req.UserId, team.SeasonGameId.Value, teamId, ct))
            return Result<TeamMemberDto>.Fail("already_on_a_team",
                $"{user.FullName} is already on another team in this competition.");

        var max = Roster.EffectiveMaxSize(team.Sport, team.SeasonGame?.MaxRosterSize);
        if (team.Members.Count >= max)
            return Result<TeamMemberDto>.Fail("roster_full", $"Roster is full ({max} players).");

        var member = uow.TeamMembers.Add(new TeamMember
        {
            TeamId        = teamId,
            UserId        = req.UserId,
            IsCaptain     = false,
            Status        = TeamMemberStatus.Active,
            ShirtNumber   = Clean(req.ShirtNumber),
            Position      = Clean(req.Position),
            AddedByUserId = actorUserId,
            AddedAt       = DateTimeOffset.UtcNow,
        });
        await uow.SaveChangesAsync(ct);

        log.LogInformation("Player {UserId} added to team {TeamId} by {Actor}", req.UserId, teamId, actorUserId);
        return Result<TeamMemberDto>.Ok(ToMemberDto(member, user));
    }

    public async Task<Result<TeamMemberDto>> UpdateMemberAsync(
        Guid teamId, Guid memberId, UpdateTeamMemberRequest req, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default)
    {
        var member = await uow.TeamMembers.GetWithTeamAsync(memberId, track: true, ct);
        if (member is null || member.TeamId != teamId || member.Status != TeamMemberStatus.Active)
            return Result<TeamMemberDto>.Fail("member_not_found", "Roster entry not found.");
        if (!CanManage(member.Team, actorUserId, actorIsAdmin))
            return Result<TeamMemberDto>.Fail("forbidden", "Only the team captain can manage this roster.");

        member.ShirtNumber = Clean(req.ShirtNumber);
        member.Position    = Clean(req.Position);
        await uow.SaveChangesAsync(ct);

        var user = await users.FindByIdAsync(member.UserId.ToString());
        return Result<TeamMemberDto>.Ok(ToMemberDto(member, user!));
    }

    public async Task<Result<bool>> RemoveMemberAsync(
        Guid teamId, Guid memberId, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default)
    {
        var member = await uow.TeamMembers.GetWithTeamAsync(memberId, track: true, ct);
        if (member is null || member.TeamId != teamId)
            return Result<bool>.Fail("member_not_found", "Roster entry not found.");
        if (!CanManage(member.Team, actorUserId, actorIsAdmin))
            return Result<bool>.Fail("forbidden", "Only the team captain can manage this roster.");
        if (member.IsCaptain)
            return Result<bool>.Fail("cannot_remove_captain", "Transfer captaincy before removing the captain.");
        if (member.Status != TeamMemberStatus.Active)
            return Result<bool>.Ok(true);   // already gone — idempotent

        member.Status    = TeamMemberStatus.Removed;
        member.RemovedAt = DateTimeOffset.UtcNow;
        await uow.SaveChangesAsync(ct);

        log.LogInformation("Member {MemberId} removed from team {TeamId} by {Actor}", memberId, teamId, actorUserId);
        return Result<bool>.Ok(true);
    }

    public async Task<IReadOnlyList<MyTeamDto>> ListMyTeamsAsync(Guid userId, CancellationToken ct = default)
    {
        var rows = await uow.TeamMembers.ListActiveByUserAsync(userId, ct);
        return rows.Select(m => new MyTeamDto(
            m.Id, m.TeamId, m.Team.Sport, m.Team.Name, m.Team.Apartment.Name,
            m.Team.SeasonGame?.Season?.Name,
            m.Team.Captain?.FullName ?? m.Team.CaptainName,
            m.IsCaptain, m.ShirtNumber, m.Position)).ToList();
    }

    public async Task<Result<bool>> LeaveTeamAsync(Guid membershipId, Guid userId, CancellationToken ct = default)
    {
        var member = await uow.TeamMembers.GetWithTeamAsync(membershipId, track: true, ct);
        // You can only leave your OWN membership.
        if (member is null || member.UserId != userId)
            return Result<bool>.Fail("member_not_found", "Membership not found.");
        if (member.Status != TeamMemberStatus.Active)
            return Result<bool>.Ok(true);
        if (member.IsCaptain)
            return Result<bool>.Fail("captain_cannot_leave", "Transfer captaincy before leaving this team.");

        member.Status    = TeamMemberStatus.Removed;
        member.RemovedAt = DateTimeOffset.UtcNow;
        await uow.SaveChangesAsync(ct);

        log.LogInformation("User {UserId} left team {TeamId} (membership {MemberId})", userId, member.TeamId, membershipId);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<bool>> TransferCaptaincyAsync(
        Guid teamId, Guid newCaptainUserId, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default)
    {
        var team = await uow.Teams.GetWithMembersAsync(teamId, track: true, ct);
        if (team is null) return Result<bool>.Fail("team_not_found", "Team not found.");
        if (!CanManage(team, actorUserId, actorIsAdmin))
            return Result<bool>.Fail("forbidden", "Only the current captain or an admin can transfer captaincy.");

        if (team.CaptainUserId == newCaptainUserId) return Result<bool>.Ok(true);   // no-op

        var target = team.Members.FirstOrDefault(m => m.UserId == newCaptainUserId);
        if (target is null)
            return Result<bool>.Fail("not_a_member", "The new captain must be on the team's roster.");

        // Exactly one IsCaptain per team. Flip every Active row, then point the FK.
        foreach (var m in team.Members) m.IsCaptain = m.UserId == newCaptainUserId;
        team.CaptainUserId = newCaptainUserId;
        team.CaptainName   = target.User.FullName;
        if (!string.IsNullOrWhiteSpace(target.User.PhoneNumber))
            team.CaptainMobile = target.User.PhoneNumber!;

        await uow.SaveChangesAsync(ct);

        // CaptainName shows on the public listing → drop the teams cache family.
        cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix);
        log.LogInformation("Captaincy of team {TeamId} transferred to {NewCaptain} by {Actor}", teamId, newCaptainUserId, actorUserId);
        return Result<bool>.Ok(true);
    }

    public async Task<IReadOnlyList<RosterChangeDto>> ListRecentChangesAsync(Guid teamId, int limit, CancellationToken ct = default)
    {
        var rows = await uow.TeamMembers.ListRecentByTeamAsync(teamId, limit, ct);
        return rows.Select(m => new RosterChangeDto(
            m.UserId, m.User.FullName, m.IsCaptain,
            m.Status == TeamMemberStatus.Removed ? "removed" : "added",
            m.RemovedAt ?? m.AddedAt)).ToList();
    }

    private static bool CanManage(Team team, Guid actorUserId, bool actorIsAdmin)
        => actorIsAdmin || team.CaptainUserId == actorUserId;

    private static string? Clean(string? s)
        => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static TeamMemberDto ToMemberDto(TeamMember m, AppUser user) => new(
        m.Id, m.UserId, user.FullName, user.AvatarUrl,
        Mask.Phone(user.PhoneNumber), m.IsCaptain, m.ShirtNumber, m.Position, m.AddedAt);
}
