using Epl.Application.Auth.Common;
using Epl.Application.Common;
using Epl.Application.Common.Caching;
using Epl.Application.Teams.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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

        var allPhMobiles = teams.SelectMany(t => t.Members)
            .Where(m => m.Status == TeamMemberStatus.Active && m.UserId == null)
            .Select(m => m.PlaceholderMobile!).Distinct().ToList();
        var registered = allPhMobiles.Count == 0
            ? new HashSet<string>()
            : (await users.Users.Where(u => u.PhoneNumber != null && allPhMobiles.Contains(u.PhoneNumber!))
                                .Select(u => u.PhoneNumber!).ToListAsync(ct)).ToHashSet();

        return teams.Select(t => new CaptainTeamDto(
            t.Id, t.Sport, t.Name, t.Apartment.Name, t.SeasonGame?.Season?.Name,
            t.Members.Count(m => m.Status == TeamMemberStatus.Active),
            Roster.EffectiveMaxSize(t.Sport, t.SeasonGame?.MaxRosterSize),
            t.Members.Count(m => m.Status == TeamMemberStatus.Active && m.UserId == null
                              && registered.Contains(m.PlaceholderMobile!)))).ToList();
    }

    public async Task<TeamRosterDto?> GetRosterAsync(Guid teamId, CancellationToken ct = default)
    {
        var t = await uow.Teams.GetWithMembersAsync(teamId, track: false, ct);
        if (t is null) return null;

        var active = t.Members.Where(m => m.Status == TeamMemberStatus.Active).ToList();

        var phMobiles = active.Where(m => m.UserId == null).Select(m => m.PlaceholderMobile!).Distinct().ToList();
        var registeredMobiles = phMobiles.Count == 0
            ? new HashSet<string>()
            : (await users.Users.Where(u => u.PhoneNumber != null && phMobiles.Contains(u.PhoneNumber!))
                                .Select(u => u.PhoneNumber!).ToListAsync(ct)).ToHashSet();

        var memberDtos = new List<TeamMemberDto>(active.Count);
        foreach (var m in active.OrderByDescending(m => m.IsCaptain).ThenBy(m => SortName(m)))
        {
            if (m.UserId is null)
                memberDtos.Add(ToPlaceholderDto(m, needsAttention: registeredMobiles.Contains(m.PlaceholderMobile!)));
            else if (m.User is not null)
                memberDtos.Add(ToMemberDto(m, m.User, needsAttention: false));
        }

        return new TeamRosterDto(t.Id, t.Sport, t.Name, t.Apartment.Name,
            t.SeasonGame?.Season?.Name, t.CaptainUserId,
            Roster.EffectiveMaxSize(t.Sport, t.SeasonGame?.MaxRosterSize), memberDtos);
    }

    public async Task<Result<TeamMemberDto>> AddMemberAsync(
        Guid teamId, AddTeamMemberRequest req, Guid actorUserId, bool actorIsAdmin, CancellationToken ct = default)
    {
        var team = await uow.Teams.GetWithMembersAsync(teamId, track: false, ct);
        if (team is null) return Result<TeamMemberDto>.Fail("team_not_found", "Team not found.");
        if (!CanManage(team, actorUserId, actorIsAdmin))
            return Result<TeamMemberDto>.Fail("forbidden", "Only the team captain can manage this roster.");

        var max = Roster.EffectiveMaxSize(team.Sport, team.SeasonGame?.MaxRosterSize);
        if (team.Members.Count(m => m.Status == TeamMemberStatus.Active) >= max)
            return Result<TeamMemberDto>.Fail("roster_full", $"Roster is full ({max} players).");

        // ── Placeholder branch ──────────────────────────────────────────────
        if (req.UserId is null)
        {
            var mobile = IdentifierParser.ToE164Mobile(req.PlaceholderMobile!);

            // If this mobile already belongs to a registered user, add THEM instead.
            var existing = await users.Users.FirstOrDefaultAsync(u => u.PhoneNumber == mobile, ct);
            if (existing is not null)
                return await AddRegisteredAsync(team, existing.Id, req, actorUserId, ct, max, existing);

            if (team.Members.Any(m => m.Status == TeamMemberStatus.Active
                                   && m.UserId == null && m.PlaceholderMobile == mobile))
                return Result<TeamMemberDto>.Fail("already_added", "That number is already on this roster.");

            var ph = uow.TeamMembers.Add(new TeamMember
            {
                TeamId            = teamId,
                UserId            = null,
                PlaceholderName   = req.PlaceholderName!.Trim(),
                PlaceholderMobile = mobile,
                IsCaptain         = false,
                Status            = TeamMemberStatus.Active,
                ShirtNumber       = Clean(req.ShirtNumber),
                Position          = Clean(req.Position),
                AddedByUserId     = actorUserId,
                AddedAt           = DateTimeOffset.UtcNow,
            });
            await uow.SaveChangesAsync(ct);
            cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix);
            log.LogInformation("Placeholder '{Name}' added to team {TeamId} by {Actor}", ph.PlaceholderName, teamId, actorUserId);
            return Result<TeamMemberDto>.Ok(ToPlaceholderDto(ph, needsAttention: false));
        }

        // ── Registered branch ───────────────────────────────────────────────
        var user = await users.FindByIdAsync(req.UserId.Value.ToString());
        if (user is null) return Result<TeamMemberDto>.Fail("user_not_found", "That player doesn't have an account yet.");
        return await AddRegisteredAsync(team, req.UserId.Value, req, actorUserId, ct, max, user);
    }

    private async Task<Result<TeamMemberDto>> AddRegisteredAsync(
        Team team, Guid userId, AddTeamMemberRequest req, Guid actorUserId, CancellationToken ct, int max, AppUser user)
    {
        if (team.Members.Any(m => m.Status == TeamMemberStatus.Active && m.UserId == userId))
            return Result<TeamMemberDto>.Fail("already_member", $"{user.FullName} is already on this team.");

        if (team.SeasonGameId.HasValue &&
            await uow.TeamMembers.ExistsActiveInSameSeasonGameAsync(userId, team.SeasonGameId.Value, team.Id, ct))
            return Result<TeamMemberDto>.Fail("already_on_a_team",
                $"{user.FullName} is already on another team in this competition.");

        var member = uow.TeamMembers.Add(new TeamMember
        {
            TeamId        = team.Id,
            UserId        = userId,
            IsCaptain     = false,
            Status        = TeamMemberStatus.Active,
            ShirtNumber   = Clean(req.ShirtNumber),
            Position      = Clean(req.Position),
            AddedByUserId = actorUserId,
            AddedAt       = DateTimeOffset.UtcNow,
        });
        await uow.SaveChangesAsync(ct);
        cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix);
        log.LogInformation("Player {UserId} added to team {TeamId} by {Actor}", userId, team.Id, actorUserId);
        return Result<TeamMemberDto>.Ok(ToMemberDto(member, user, needsAttention: false));
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

        if (member.UserId is null)
            return Result<TeamMemberDto>.Ok(ToPlaceholderDto(member, needsAttention: false));

        var user = await users.FindByIdAsync(member.UserId.Value.ToString());
        return Result<TeamMemberDto>.Ok(ToMemberDto(member, user!, needsAttention: false));
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
        if (target?.User is null)
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

    public async Task<IReadOnlyList<PendingLinkDto>> ListPendingLinksAsync(Guid userId, CancellationToken ct = default)
    {
        var rows = await uow.TeamMembers.ListPendingLinksByUserAsync(userId, ct);
        return rows.Select(m => new PendingLinkDto(
            m.Id, m.TeamId, m.Team.Sport, m.Team.Name, m.Team.Apartment.Name,
            m.Team.SeasonGame?.Season?.Name)).ToList();
    }

    public async Task<Result<bool>> AcknowledgeLinkAsync(Guid membershipId, Guid userId, CancellationToken ct = default)
    {
        var member = await uow.TeamMembers.GetWithTeamAsync(membershipId, track: true, ct);
        if (member is null || member.UserId != userId)
            return Result<bool>.Fail("member_not_found", "Membership not found.");
        if (member.AcknowledgedAt is null)
        {
            member.AcknowledgedAt = DateTimeOffset.UtcNow;
            await uow.SaveChangesAsync(ct);
        }
        return Result<bool>.Ok(true);
    }

    public async Task<IReadOnlyList<RosterChangeDto>> ListRecentChangesAsync(Guid teamId, int limit, CancellationToken ct = default)
    {
        var rows = await uow.TeamMembers.ListRecentByTeamAsync(teamId, limit, ct);
        return rows.Select(m => new RosterChangeDto(
            m.UserId ?? Guid.Empty,
            m.User?.FullName ?? m.PlaceholderName ?? "Unknown",
            m.IsCaptain,
            m.Status == TeamMemberStatus.Removed ? "removed" : "added",
            m.RemovedAt ?? m.AddedAt)).ToList();
    }

    private static bool CanManage(Team team, Guid actorUserId, bool actorIsAdmin)
        => actorIsAdmin || team.CaptainUserId == actorUserId;

    private static string? Clean(string? s)
        => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static TeamMemberDto ToMemberDto(TeamMember m, AppUser user, bool needsAttention) => new(
        m.Id, user.Id, user.FullName, user.AvatarUrl,
        Mask.Phone(user.PhoneNumber), m.IsCaptain, m.ShirtNumber, m.Position, m.AddedAt,
        IsPlaceholder: false, NeedsAttention: needsAttention);

    private static TeamMemberDto ToPlaceholderDto(TeamMember m, bool needsAttention) => new(
        m.Id, null, m.PlaceholderName!, null,
        m.PlaceholderMobile!, m.IsCaptain, m.ShirtNumber, m.Position, m.AddedAt,
        IsPlaceholder: true, NeedsAttention: needsAttention);

    private static string SortName(TeamMember m)
        => m.UserId is null ? (m.PlaceholderName ?? "") : (m.User?.FullName ?? "");
}
