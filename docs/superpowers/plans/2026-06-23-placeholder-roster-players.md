# Placeholder (unregistered) roster players — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a captain add a player by name + mobile before that player has an account, and auto-link the placeholder to the real account when the player later registers with the same mobile.

**Architecture:** Extend the existing `TeamMember` row (nullable `UserId` + placeholder name/mobile) rather than add a new entity. Matching runs at two symmetric points — when the captain adds (resolve to a registered user if the mobile already exists) and when a user registers (convert matching placeholders, skipping any that would violate the one-team-per-SeasonGame rule). A one-time, non-blocking welcome card on `/profile` lets the new user keep/leave the teams they were auto-added to.

**Tech Stack:** ASP.NET Core (.NET 10), EF Core 10, ASP.NET Identity, FluentValidation; Next.js 16 App Router, React 19, TypeScript 5, Tailwind 4.

## Global Constraints

- **Spec of record:** [docs/superpowers/specs/2026-06-23-placeholder-roster-players-design.md](../specs/2026-06-23-placeholder-roster-players-design.md). Decisions P1–P6 are binding.
- **No automated test framework exists in this repo** (CLAUDE.md: "No automated tests yet"). Each task is verified by **build + type-check + a scripted manual smoke check**, not unit tests. The registration-linking path (Task 5) is critical-path — its manual smoke check is mandatory before commit.
- **Verify command:** `npm run verify` (secret scan + `tsc --noEmit` web + API Release build). Must pass before any commit that touches both apps; for API-only tasks run `dotnet build apps/api/Epl.Api.slnx -c Release -nologo`, for web-only run `npx tsc --noEmit -p apps/web/tsconfig.json`.
- **Migrations auto-apply on startup** via `db.Database.MigrateAsync()` — do NOT add a separate migration step. Generate with `dotnet ef migrations add`.
- **Result<T> pattern** — service methods return `Result<T>`; controllers map `Error → BadRequest`. Don't throw for domain errors.
- **Authorization** — captain endpoints use `AuthorizationPolicies.TeamCaptainOrAdmin`; the per-resource captain check is `CanManage(team, actorUserId, actorIsAdmin)` already in `TeamMemberService`.
- **Phone numbers in E.164** (`+91…`); normalise with `IdentifierParser.ToE164Mobile`.
- **Don't leak EF entities** through controllers; map to DTOs. **Mask PII** for registered users (`Mask.Phone`); placeholder mobile is shown unmasked to the captain who typed it.
- **No new `SET NULL`/cascade FK to `AspNetUsers`** (avoids SQL Server error 1785 — see the captain-FK fix already on this branch).
- Branch: `feature/feature-team-event`. Commit per task; do not push unless asked.

---

## File Structure

**Backend**
- `Epl.Domain/Entities/TeamMember.cs` — nullable `UserId`; new `PlaceholderName`, `PlaceholderMobile`, `LinkedFromPlaceholder`, `AcknowledgedAt`.
- `Epl.Infrastructure/Persistence/Configurations/TeamMemberConfig.cs` — optional `User`, lengths, new partial unique index, CHECK constraint.
- `Epl.Infrastructure/Persistence/Migrations/*_AddPlaceholderMembers.cs` — generated.
- `Epl.Domain/Abstractions/ITeamMemberRepository.cs` + `Epl.Infrastructure/Repositories/TeamMemberRepository.cs` — two new queries.
- `Epl.Application/Teams/Dtos/TeamMemberDtos.cs` — widened request, DTO flags, pending-link DTO.
- `Epl.Application/Teams/Validators/AddTeamMemberRequestValidator.cs` — new (either-or rule).
- `Epl.Application/Teams/Services/ITeamMemberService.cs` + `TeamMemberService.cs` — add-time branch, placeholder mapping, acknowledge, pending links.
- `Epl.Application/Auth/Services/AuthService.cs` — register-time linking hook.
- `Epl.Api/Controllers/ProfileController.cs`, `TeamMembershipController.cs` — pending-links + acknowledge endpoints.

**Frontend**
- `apps/web/src/lib/captain.ts` — `TeamMember` flags + nullable `userId`; pending-link type + fetch.
- `apps/web/src/app/captain/actions.ts` — `addPlaceholderAction`, `matchMobileAction`.
- `apps/web/src/app/captain/teams/[teamId]/roster-manager.tsx` — segmented toggle, manual form, match-back, chips.
- `apps/web/src/app/captain/page.tsx` — needs-attention badge.
- `apps/web/src/app/profile/welcome-links.tsx` (new) + `apps/web/src/app/profile/page.tsx` + `apps/web/src/app/profile/actions.ts` — welcome card + acknowledge.

---

## Task 1: Schema — entity, config, migration

**Files:**
- Modify: `apps/api/src/Epl.Domain/Entities/TeamMember.cs`
- Modify: `apps/api/src/Epl.Infrastructure/Persistence/Configurations/TeamMemberConfig.cs`
- Create: `apps/api/src/Epl.Infrastructure/Persistence/Migrations/*_AddPlaceholderMembers.cs` (generated)

**Interfaces:**
- Produces: `TeamMember.UserId` is now `Guid?`; new fields `string? PlaceholderName`, `string? PlaceholderMobile`, `bool LinkedFromPlaceholder`, `DateTimeOffset? AcknowledgedAt`. Row invariant enforced by `CK_TeamMembers_Identity`.

- [ ] **Step 1: Make `UserId` nullable and add fields in `TeamMember.cs`**

Change `UserId` and `User`, and add the four fields:

```csharp
    public Guid? UserId { get; set; }
    public AppUser? User { get; set; }

    /// <summary>Set iff <see cref="UserId"/> is null — unregistered player added by the captain.</summary>
    public string? PlaceholderName { get; set; }

    /// <summary>E.164 mobile of an unregistered player; the key used to auto-link on registration.</summary>
    public string? PlaceholderMobile { get; set; }

    /// <summary>True when registration converted a placeholder into this real membership (drives the welcome card).</summary>
    public bool LinkedFromPlaceholder { get; set; }

    /// <summary>Null until the auto-added user keeps/leaves it via the welcome card.</summary>
    public DateTimeOffset? AcknowledgedAt { get; set; }
```

- [ ] **Step 2: Update `TeamMemberConfig.cs`**

Make the User relationship optional, add lengths, the new partial unique index, and the CHECK constraint. Replace the `HasOne(m => m.User)` block and add the new index + CHECK:

```csharp
        b.Property(m => m.PlaceholderName).HasMaxLength(80);
        b.Property(m => m.PlaceholderMobile).HasMaxLength(20);

        b.HasOne(m => m.User)
         .WithMany()
         .HasForeignKey(m => m.UserId)
         .IsRequired(false)
         .OnDelete(DeleteBehavior.Restrict);

        // Same number can't be a placeholder twice on one team (Active only).
        b.HasIndex(m => new { m.TeamId, m.PlaceholderMobile })
            .IsUnique()
            .HasFilter("[Status] = 1 AND [UserId] IS NULL");

        // A row is EITHER a real member (UserId set) OR a placeholder (name+mobile set).
        b.ToTable(t => t.HasCheckConstraint("CK_TeamMembers_Identity",
            "([UserId] IS NOT NULL AND [PlaceholderName] IS NULL AND [PlaceholderMobile] IS NULL) " +
            "OR ([UserId] IS NULL AND [PlaceholderName] IS NOT NULL AND [PlaceholderMobile] IS NOT NULL)"));
```

- [ ] **Step 3: Generate the migration**

Run:
```bash
dotnet ef migrations add AddPlaceholderMembers \
  --project apps/api/src/Epl.Infrastructure \
  --startup-project apps/api/src/Epl.Api \
  -o Persistence/Migrations
```
Expected: a new `*_AddPlaceholderMembers.cs` that alters `TeamMembers.UserId` to nullable, adds the four columns, the filtered unique index, and the CHECK constraint.

- [ ] **Step 4: Inspect the generated migration**

Open the generated file. Confirm: `AlterColumn<Guid>("UserId", ... nullable: true)`; four `AddColumn`; `CreateIndex(... filter: "[Status] = 1 AND [UserId] IS NULL")`; the CHECK in `CreateCheckConstraint`/`AddCheckConstraint`. Confirm there is **no** new foreign key to `AspNetUsers` with `SET NULL`/cascade.

- [ ] **Step 5: Build + apply against the dev DB**

Run:
```bash
dotnet build apps/api/Epl.Api.slnx -c Release -nologo
```
Expected: Build succeeded. Then start the API once (`npm run dev:api`) and confirm the log shows the migration applying with no error, and existing roster pages still load. Stop the API.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/Epl.Domain/Entities/TeamMember.cs \
        apps/api/src/Epl.Infrastructure/Persistence/Configurations/TeamMemberConfig.cs \
        apps/api/src/Epl.Infrastructure/Persistence/Migrations
git commit -m "feat(teams): placeholder roster member schema (nullable UserId + placeholder fields)"
```

---

## Task 2: Repository queries

**Files:**
- Modify: `apps/api/src/Epl.Domain/Abstractions/ITeamMemberRepository.cs`
- Modify: `apps/api/src/Epl.Infrastructure/Repositories/TeamMemberRepository.cs`

**Interfaces:**
- Consumes: `TeamMember` fields from Task 1.
- Produces:
  - `Task<IReadOnlyList<TeamMember>> ListActivePlaceholdersByMobileAsync(string mobileE164, CancellationToken ct = default)` — Active placeholder rows (`UserId == null`) with that mobile, **including** `Team` and `Team.SeasonGame` for the C8 check.
  - `Task<IReadOnlyList<TeamMember>> ListPendingLinksByUserAsync(Guid userId, CancellationToken ct = default)` — Active rows where `LinkedFromPlaceholder && AcknowledgedAt == null`, including `Team`, `Team.Apartment`, `Team.SeasonGame.Season`.

- [ ] **Step 1: Declare the two methods in `ITeamMemberRepository.cs`**

```csharp
    Task<IReadOnlyList<TeamMember>> ListActivePlaceholdersByMobileAsync(string mobileE164, CancellationToken ct = default);

    Task<IReadOnlyList<TeamMember>> ListPendingLinksByUserAsync(Guid userId, CancellationToken ct = default);
```

- [ ] **Step 2: Implement in `TeamMemberRepository.cs`**

Use the existing `Set`/`DbContext` pattern already in the file (mirror `ListActiveByUserAsync`). Add:

```csharp
    public async Task<IReadOnlyList<TeamMember>> ListActivePlaceholdersByMobileAsync(
        string mobileE164, CancellationToken ct = default)
        => await Query()
            .Include(m => m.Team).ThenInclude(t => t.SeasonGame)
            .Where(m => m.Status == TeamMemberStatus.Active
                     && m.UserId == null
                     && m.PlaceholderMobile == mobileE164)
            .OrderBy(m => m.AddedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<TeamMember>> ListPendingLinksByUserAsync(
        Guid userId, CancellationToken ct = default)
        => await Query()
            .Include(m => m.Team).ThenInclude(t => t.Apartment)
            .Include(m => m.Team).ThenInclude(t => t.SeasonGame).ThenInclude(sg => sg!.Season)
            .Where(m => m.Status == TeamMemberStatus.Active
                     && m.UserId == userId
                     && m.LinkedFromPlaceholder
                     && m.AcknowledgedAt == null)
            .OrderBy(m => m.AddedAt)
            .ToListAsync(ct);
```

> If the repo exposes the query root differently (e.g. `_db.TeamMembers` or `Set()` rather than a `Query()` helper), match the existing method in this file — read `ListActiveByUserAsync` directly above and copy its query-root style.

- [ ] **Step 3: Build**

Run: `dotnet build apps/api/Epl.Api.slnx -c Release -nologo`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/Epl.Domain/Abstractions/ITeamMemberRepository.cs \
        apps/api/src/Epl.Infrastructure/Repositories/TeamMemberRepository.cs
git commit -m "feat(teams): repo queries for placeholder match + pending links"
```

---

## Task 3: DTOs + validator (either-or add request)

**Files:**
- Modify: `apps/api/src/Epl.Application/Teams/Dtos/TeamMemberDtos.cs`
- Create: `apps/api/src/Epl.Application/Teams/Validators/AddTeamMemberRequestValidator.cs`

**Interfaces:**
- Produces:
  - `AddTeamMemberRequest(Guid? UserId, string? PlaceholderName, string? PlaceholderMobile, string? ShirtNumber, string? Position)`.
  - `TeamMemberDto` gains `Guid? UserId` (was `Guid`), `bool IsPlaceholder`, `bool NeedsAttention`.
  - New `PendingLinkDto(Guid MembershipId, Guid TeamId, Sport Sport, string TeamName, string ApartmentName, string? SeasonName)`.

- [ ] **Step 1: Widen `AddTeamMemberRequest` and `TeamMemberDto`, add `PendingLinkDto`**

Replace the existing `AddTeamMemberRequest` (line 59) and `TeamMemberDto` (lines 16-25):

```csharp
public record TeamMemberDto(
    Guid    Id,
    Guid?   UserId,            // null for placeholder rows
    string  FullName,          // placeholder name when UserId is null
    string? AvatarUrl,
    string  PhoneMasked,       // unmasked placeholder mobile when UserId is null
    bool    IsCaptain,
    string? ShirtNumber,
    string? Position,
    DateTimeOffset AddedAt,
    bool    IsPlaceholder,
    bool    NeedsAttention);   // placeholder whose mobile now matches a registered user

public record AddTeamMemberRequest(
    Guid?   UserId,
    string? PlaceholderName,
    string? PlaceholderMobile,
    string? ShirtNumber,
    string? Position);

public record PendingLinkDto(
    Guid    MembershipId,
    Guid    TeamId,
    Sport   Sport,
    string  TeamName,
    string  ApartmentName,
    string? SeasonName);
```

- [ ] **Step 2: Create the validator**

`AddTeamMemberRequestValidator.cs` — FluentValidation auto-runs (registered by assembly scan like the other validators). Mirror an existing validator's namespace/usings:

```csharp
using Epl.Application.Teams.Dtos;
using FluentValidation;

namespace Epl.Application.Teams.Validators;

public class AddTeamMemberRequestValidator : AbstractValidator<AddTeamMemberRequest>
{
    public AddTeamMemberRequestValidator()
    {
        // Exactly one identity branch: registered (UserId) XOR placeholder (name+mobile).
        RuleFor(x => x).Must(BeExactlyOneIdentity)
            .WithMessage("Provide either a registered user or a name + mobile, not both.");

        When(x => x.UserId is null, () =>
        {
            RuleFor(x => x.PlaceholderName).NotEmpty().MaximumLength(80)
                .WithMessage("Enter the player's name.");
            RuleFor(x => x.PlaceholderMobile).NotEmpty()
                .Matches(@"^(\+91|0)?[6-9]\d{9}$")
                .WithMessage("Enter a valid 10-digit Indian mobile.");
        });

        RuleFor(x => x.ShirtNumber).MaximumLength(10);
        RuleFor(x => x.Position).MaximumLength(60);
    }

    private static bool BeExactlyOneIdentity(AddTeamMemberRequest r)
    {
        var hasUser        = r.UserId is not null;
        var hasPlaceholder = !string.IsNullOrWhiteSpace(r.PlaceholderName)
                          || !string.IsNullOrWhiteSpace(r.PlaceholderMobile);
        return hasUser ^ hasPlaceholder;
    }
}
```

- [ ] **Step 3: Build**

Run: `dotnet build apps/api/Epl.Api.slnx -c Release -nologo`
Expected: Build fails in `TeamMemberService.cs` and any `ToMemberDto` caller because `TeamMemberDto` now has extra params and `AddTeamMemberRequest.UserId` is nullable. That is expected — Task 4 fixes the service. **Do not commit yet**; proceed to Task 4 and commit them together.

> This task and Task 4 share a compile boundary (the DTO change breaks the service), so they commit together at the end of Task 4.

---

## Task 4: Add-time placeholder branch + roster mapping

**Files:**
- Modify: `apps/api/src/Epl.Application/Teams/Services/TeamMemberService.cs`
- Modify (if needed for new helper): same file

**Interfaces:**
- Consumes: Task 2 repo methods; Task 3 DTOs; `IdentifierParser.ToE164Mobile`; `users` (`UserManager<AppUser>`), `uow`, `Roster.EffectiveMaxSize`, `cache`, `CacheKeys.TeamsFamilyPrefix`, `CanManage`.
- Produces: `AddMemberAsync` handles both branches and returns a `TeamMemberDto` (with `IsPlaceholder`); `GetRosterAsync` returns members with `IsPlaceholder`/`NeedsAttention` populated. New private helpers `ToMemberDto`, `ToPlaceholderDto`.

- [ ] **Step 1: Add `using Microsoft.EntityFrameworkCore;`** to `TeamMemberService.cs` if not present (needed for `FirstOrDefaultAsync` on `users.Users`).

- [ ] **Step 2: Rewrite `AddMemberAsync` (lines 48-86) to branch on identity**

```csharp
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
                return await AddRegisteredAsync(team, Guid.Parse(existing.Id.ToString()), req, actorUserId, ct, max, existing);

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
```

> `AppUser.Id` is a `Guid` in this project (Identity keyed by Guid). If `existing.Id` is already a `Guid`, pass it directly instead of `Guid.Parse(...)`. Verify by hovering `AppUser.Id` in `AddMemberAsync`'s existing code; adjust the one `Guid.Parse` call accordingly.

- [ ] **Step 3: Update the DTO mappers at the bottom of the file**

Find the existing `ToMemberDto` (around line 196-201) and replace/extend with both mappers:

```csharp
    private static TeamMemberDto ToMemberDto(TeamMember m, AppUser user, bool needsAttention) => new(
        m.Id, user.Id, user.FullName, user.AvatarUrl,
        Mask.Phone(user.PhoneNumber), m.IsCaptain, m.ShirtNumber, m.Position, m.AddedAt,
        IsPlaceholder: false, NeedsAttention: needsAttention);

    private static TeamMemberDto ToPlaceholderDto(TeamMember m, bool needsAttention) => new(
        m.Id, null, m.PlaceholderName!, null,
        m.PlaceholderMobile!, m.IsCaptain, m.ShirtNumber, m.Position, m.AddedAt,
        IsPlaceholder: true, NeedsAttention: needsAttention);
```

- [ ] **Step 4: Update `GetRosterAsync` (around lines 33-46) to map placeholders + compute `NeedsAttention`**

After loading the team's members, compute which placeholder mobiles match a registered user (one query), then map each member through the right mapper:

```csharp
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
            else
            {
                var u = await users.FindByIdAsync(m.UserId.Value.ToString());
                if (u is not null) memberDtos.Add(ToMemberDto(m, u, needsAttention: false));
            }
        }

        return new TeamRosterDto(t.Id, t.Sport, t.Name, t.Apartment.Name,
            t.SeasonGame?.Season?.Name, t.CaptainUserId,
            Roster.EffectiveMaxSize(t.Sport, t.SeasonGame?.MaxRosterSize), memberDtos);
```

Add a small local sort helper if the existing code sorted inline:
```csharp
    private static string SortName(TeamMember m) => m.UserId is null ? (m.PlaceholderName ?? "") : "";
```

> If `GetRosterAsync` currently loads users in a single batch rather than per-member, preserve that style — the key changes are (a) the `registeredMobiles` lookup and (b) routing placeholder rows through `ToPlaceholderDto`. Read the current method body before editing and keep its loading strategy.

- [ ] **Step 5: Build**

Run: `dotnet build apps/api/Epl.Api.slnx -c Release -nologo`
Expected: Build succeeded (Task 3 + Task 4 together now compile).

- [ ] **Step 6: Manual smoke**

Start the API + web (`npm run dev`). As a captain, open `/captain/teams/[teamId]`. Using a REST client or the UI once Task 7 lands, `POST /api/teams/{teamId}/members` with `{ "placeholderName": "Test Player", "placeholderMobile": "9876500011" }`. Expected: 200, a placeholder row in `GET /api/teams/{teamId}/members` with `isPlaceholder: true`, `userId: null`. Repeat the same mobile → 400 `already_added`. POST with a mobile that matches an existing user → row created as a registered member (`isPlaceholder: false`).

- [ ] **Step 7: Commit (Tasks 3 + 4)**

```bash
git add apps/api/src/Epl.Application/Teams/Dtos/TeamMemberDtos.cs \
        apps/api/src/Epl.Application/Teams/Validators/AddTeamMemberRequestValidator.cs \
        apps/api/src/Epl.Application/Teams/Services/TeamMemberService.cs
git commit -m "feat(teams): add unregistered players to a roster + match-back at add-time"
```

---

## Task 5: Register-time linking (critical path)

**Files:**
- Modify: `apps/api/src/Epl.Application/Auth/Services/AuthService.cs`

**Interfaces:**
- Consumes: `uow.TeamMembers.ListActivePlaceholdersByMobileAsync`, `ExistsActiveInSameSeasonGameAsync`, `cache.RemoveByPrefix`, `CacheKeys.TeamsFamilyPrefix`, `IdentifierKind`.
- Produces: after a **mobile** registration, matching placeholders are converted to real memberships (`UserId` set, placeholder fields cleared, `LinkedFromPlaceholder=true`, `AcknowledgedAt=null`), skipping C8 conflicts.

- [ ] **Step 1: Add a private linking helper to `AuthService.cs`**

```csharp
    private async Task LinkPlaceholdersAsync(AppUser user, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.PhoneNumber)) return;

        var placeholders = await uow.TeamMembers.ListActivePlaceholdersByMobileAsync(user.PhoneNumber!, ct);
        if (placeholders.Count == 0) return;

        var claimedSeasonGames = new HashSet<Guid>();
        var linked = 0;

        foreach (var ph in placeholders)
        {
            var sgId = ph.Team.SeasonGameId;

            // C8: one active membership per SeasonGame. Guard against existing rows AND
            // against linking two placeholders that share a SeasonGame in this same batch.
            if (sgId.HasValue)
            {
                if (claimedSeasonGames.Contains(sgId.Value)) continue;
                if (await uow.TeamMembers.ExistsActiveInSameSeasonGameAsync(user.Id, sgId.Value, ph.TeamId, ct))
                    continue;
                claimedSeasonGames.Add(sgId.Value);
            }

            ph.UserId                = user.Id;
            ph.PlaceholderName       = null;
            ph.PlaceholderMobile     = null;
            ph.LinkedFromPlaceholder = true;
            ph.AcknowledgedAt        = null;
            linked++;
            log.LogInformation("Linked placeholder {MemberId} on team {TeamId} to new user {UserId}",
                ph.Id, ph.TeamId, user.Id);
        }

        if (linked > 0)
        {
            await uow.SaveChangesAsync(ct);
            cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix);
        }
    }
```

> Confirm `AuthService` already has `uow`, `cache`, and `log` injected. It uses `uow.Teams` in `ToMeAsync` (line 69) and `log` throughout, so `uow`/`log` exist. If `cache` is not injected, add `ICacheStore cache` to the constructor (follow `TeamMemberService`'s constructor for the exact type/namespace) — otherwise drop the two `cache.RemoveByPrefix` lines and accept a slightly stale teams cache until its TTL.

- [ ] **Step 2: Call it from `RegisterAsync`, mobile-only, before sign-in**

In `RegisterAsync`, after `await users.AddToRoleAsync(user, Roles.Player);` (line 49) and before `await signIn.SignInAsync(...)` (line 52), insert:

```csharp
        if (kind == IdentifierKind.Mobile)
            await LinkPlaceholdersAsync(user, ct);
```

> `ct` must be in scope. If `RegisterAsync` has no `CancellationToken` parameter, pass `CancellationToken.None` (match how other calls in the method handle it).

- [ ] **Step 3: Build**

Run: `dotnet build apps/api/Epl.Api.slnx -c Release -nologo`
Expected: Build succeeded.

- [ ] **Step 4: Manual smoke (MANDATORY — critical path)**

1. As a captain, add a placeholder with mobile `9876500022`.
2. Register a brand-new account using mobile `9876500022`.
3. Expected: registration succeeds and signs in; `GET /api/profile/me/teams` for the new user shows that team; on the captain's roster the row is now a registered member (`isPlaceholder:false`).
4. **C8 path:** add the same mobile `9876500033` as a placeholder on **two** different teams in the **same** SeasonGame, then register with `9876500033`. Expected: exactly one team links; the other still shows a placeholder row.
5. **Email path:** register a new account by **email**. Expected: no errors, no linking attempted.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/Epl.Application/Auth/Services/AuthService.cs
git commit -m "feat(auth): link matching placeholder roster rows on registration (C8-safe)"
```

---

## Task 6: Pending-links + acknowledge endpoints

**Files:**
- Modify: `apps/api/src/Epl.Application/Teams/Services/ITeamMemberService.cs`
- Modify: `apps/api/src/Epl.Application/Teams/Services/TeamMemberService.cs`
- Modify: `apps/api/src/Epl.Api/Controllers/ProfileController.cs`
- Modify: `apps/api/src/Epl.Api/Controllers/TeamMembershipController.cs`

**Interfaces:**
- Produces:
  - `Task<IReadOnlyList<PendingLinkDto>> ListPendingLinksAsync(Guid userId, CancellationToken ct = default)`
  - `Task<Result<bool>> AcknowledgeLinkAsync(Guid membershipId, Guid userId, CancellationToken ct = default)`
  - `GET /api/profile/me/pending-links` → `PendingLinkDto[]`
  - `POST /api/team-members/{id}/acknowledge` → 200

- [ ] **Step 1: Declare both methods in `ITeamMemberService.cs`**

```csharp
    Task<IReadOnlyList<PendingLinkDto>> ListPendingLinksAsync(Guid userId, CancellationToken ct = default);
    Task<Result<bool>> AcknowledgeLinkAsync(Guid membershipId, Guid userId, CancellationToken ct = default);
```

- [ ] **Step 2: Implement in `TeamMemberService.cs`**

```csharp
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
```

- [ ] **Step 3: Add the `ProfileController` endpoint**

In `ProfileController.cs`, mirror the existing `me/teams` action (around line 27):

```csharp
    [HttpGet("me/pending-links")]
    public async Task<IActionResult> PendingLinks(CancellationToken ct)
        => Ok(await teamMembers.ListPendingLinksAsync(CurrentUserId, ct));
```

> Use whatever the controller already uses for the current user id and the injected service field name — match the existing `me/teams` action exactly (same `CurrentUserId`/`_teamMembers` identifiers).

- [ ] **Step 4: Add the `TeamMembershipController` acknowledge endpoint**

Mirror the existing `leave` action (around line 16):

```csharp
    [HttpPost("{id:guid}/acknowledge")]
    public async Task<IActionResult> Acknowledge(Guid id, CancellationToken ct)
    {
        var res = await teamMembers.AcknowledgeLinkAsync(id, CurrentUserId, ct);
        return res.IsSuccess ? Ok() : BadRequest(res.ToProblem());
    }
```

> Copy the success/error mapping style from the `leave` action in the same file (e.g. `res.ToProblem()` vs `res.Error` — use whatever that file uses).

- [ ] **Step 5: Build + smoke**

Run: `dotnet build apps/api/Epl.Api.slnx -c Release -nologo` → Build succeeded.
Smoke: as the user auto-linked in Task 5, `GET /api/profile/me/pending-links` → one row. `POST /api/team-members/{thatId}/acknowledge` → 200. Re-GET → empty.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/Epl.Application/Teams/Services/ITeamMemberService.cs \
        apps/api/src/Epl.Application/Teams/Services/TeamMemberService.cs \
        apps/api/src/Epl.Api/Controllers/ProfileController.cs \
        apps/api/src/Epl.Api/Controllers/TeamMembershipController.cs
git commit -m "feat(teams): pending-links list + acknowledge endpoints"
```

---

## Task 7: Frontend — captain manual-add UX

**Files:**
- Modify: `apps/web/src/lib/captain.ts`
- Modify: `apps/web/src/app/captain/actions.ts`
- Modify: `apps/web/src/app/captain/teams/[teamId]/roster-manager.tsx`
- Modify: `apps/web/src/app/captain/teams/[teamId]/roster.css` (or the existing roster stylesheet imported by the page)

**Interfaces:**
- Consumes: backend `TeamMemberDto` flags from Tasks 3-4.
- Produces: `addPlaceholderAction`, `matchMobileAction`; `TeamMember.userId: string | null`, `TeamMember.isPlaceholder`, `TeamMember.needsAttention`.

- [ ] **Step 1: Update types in `captain.ts`**

In `interface TeamMember`, change `userId` to nullable and add flags:

```typescript
export interface TeamMember {
  id:             string;
  userId:         string | null;
  fullName:       string;
  avatarUrl:      string | null;
  phoneMasked:    string;
  isCaptain:      boolean;
  shirtNumber:    string | null;
  position:       string | null;
  addedAt:        string;
  isPlaceholder:  boolean;
  needsAttention: boolean;
}
```

- [ ] **Step 2: Add actions in `captain/actions.ts`**

```typescript
export async function addPlaceholderAction(
  teamId: string, name: string, mobile: string,
  shirtNumber: string | null, position: string | null,
): Promise<ActionResult<TeamMember>> {
  const res = await api.post<TeamMember>(`/api/teams/${teamId}/members`,
    { placeholderName: name, placeholderMobile: mobile, shirtNumber, position });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/captain/teams/${teamId}`);
  return { ok: true, data: res.data };
}

/** Returns the registered user if this mobile already has an account, else null. */
export async function matchMobileAction(mobile: string): Promise<ActionResult<UserSearchResult | null>> {
  const term = mobile.trim();
  if (term.length < 10) return { ok: true, data: null };
  const res = await api.get<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(term)}&limit=1`);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, data: res.data[0] ?? null };
}
```

> `matchMobileAction` reuses the existing `/api/users/search` (matches name/mobile/email). Good enough for the add-time confirm hint; the authoritative resolution still happens server-side in Task 4.

- [ ] **Step 3: Add the segmented toggle + manual form to `roster-manager.tsx`**

In the `AddPlayer` component, add mode state and render a toggle above the existing search. Insert at the top of `AddPlayer`'s returned JSX (keep the existing registered-search block as the `"registered"` branch):

```tsx
  const [mode, setMode] = useState<"registered" | "manual">("registered");
```

Toggle markup (reuses `sportTag`-style pills; `aria-pressed` for a11y):

```tsx
  <div className="addModeToggle" role="group" aria-label="How to add a player">
    <button type="button" className={`addModeBtn ${mode === "registered" ? "is-on" : ""}`}
      aria-pressed={mode === "registered"} onClick={() => setMode("registered")}>Registered</button>
    <button type="button" className={`addModeBtn ${mode === "manual" ? "is-on" : ""}`}
      aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>Unregistered (manual)</button>
  </div>
```

Add a `ManualAdd` sub-component rendered when `mode === "manual"`:

```tsx
function ManualAdd({ teamId, pending, onAdded }: {
  teamId: string; pending: boolean;
  onAdded: (m: TeamMember) => void;
}) {
  const [name, setName]       = useState("");
  const [mobile, setMobile]   = useState("");
  const [shirt, setShirt]     = useState("");
  const [position, setPos]    = useState("");
  const [match, setMatch]     = useState<UserSearchResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [busy, startBusy]     = useTransition();

  function checkMobile() {
    const m = mobile.trim();
    if (m.length < 10) { setMatch(null); return; }
    matchMobileAction(m).then((r) => setMatch(r.ok ? (r.data ?? null) : null));
  }

  function submit() {
    if (!name.trim()) { setError("Enter the player's name."); return; }
    if (mobile.trim().length < 10) { setError("Enter a valid 10-digit mobile."); return; }
    setError(null);
    startBusy(async () => {
      const res = await addPlaceholderAction(teamId, name.trim(), mobile.trim(),
        shirt.trim() || null, position.trim() || null);
      if (!res.ok) { setError(res.message ?? "Could not add player."); return; }
      if (res.data) onAdded(res.data);
      setName(""); setMobile(""); setShirt(""); setPos(""); setMatch(null);
    });
  }

  return (
    <div className="manualAddForm">
      {match && (
        <p className="manualMatchHint" role="status">
          This number belongs to <strong>{match.fullName}</strong> — adding will put them on as a registered player.
        </p>
      )}
      <label className="manualField">
        <span>Full name</span>
        <input className="addFieldInput" value={name} maxLength={80}
          onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="manualField">
        <span>Mobile</span>
        <input className="addFieldInput" type="tel" inputMode="tel" value={mobile} maxLength={14}
          placeholder="+91…" onChange={(e) => setMobile(e.target.value)} onBlur={checkMobile} />
        <small className="manualHelp">Used to link them when they register.</small>
      </label>
      <div className="addFormFields">
        <input className="addFieldInput" placeholder="Shirt # (optional)" maxLength={10}
          value={shirt} onChange={(e) => setShirt(e.target.value)} aria-label="Shirt number" />
        <input className="addFieldInput" placeholder="Position (optional)" maxLength={60}
          value={position} onChange={(e) => setPos(e.target.value)} aria-label="Position" />
      </div>
      {error && <p className="rosterError" role="alert">{error}</p>}
      <button type="button" className="captainPrimaryBtn" disabled={pending || busy} onClick={submit}>
        Add to roster
      </button>
    </div>
  );
}
```

Wire it: in `AddPlayer`, when `mode === "manual"` render `<ManualAdd teamId={teamId} pending={pending} onAdded={(m) => onAdd helper} />`. Reuse the existing `onAdd` plumbing — `RosterManager.addMember` appends to state; add a sibling `onAddDirect(m: TeamMember)` that does `setMembers((list) => sortMembers([...list, m]))` and pass it down, since `ManualAdd` already has the created row.

- [ ] **Step 4: Render placeholder + needs-attention chips in the roster table**

In the member row (`roster-manager.tsx`, the `rosterName` cell), after the captain badge:

```tsx
  {m.isPlaceholder && <span className="unregChip" title="Unregistered">Unregistered</span>}
  {m.needsAttention && (
    <span className="attentionChip" role="status" title="Needs attention">Needs attention</span>
  )}
```

And below the name when `needsAttention`:
```tsx
  {m.needsAttention && (
    <p className="attentionNote">This player registered but is already on another team in this competition. Remove here or contact an admin.</p>
  )}
```

Update the transfer-candidate filter and search-dedup so placeholders are handled: in `TransferModal` candidates use `members.filter((m) => !m.isPlaceholder && m.userId !== captainId)`; in `AddPlayer` dedup use `existingUserIds = members.map((m) => m.userId).filter(Boolean)`.

- [ ] **Step 5: Add styles**

Append to the roster stylesheet (match existing token names/colors — neutral chip, amber attention):

```css
.addModeToggle { display: inline-flex; gap: 4px; margin-bottom: 12px; }
.addModeBtn { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border, #d4d4d8);
  background: transparent; cursor: pointer; font-size: 13px; }
.addModeBtn.is-on { background: var(--accent, #111827); color: #fff; border-color: transparent; }
.manualField { display: grid; gap: 4px; margin: 8px 0; }
.manualField > span { font-size: 13px; font-weight: 500; }
.manualHelp { color: var(--muted, #6b7280); font-size: 12px; }
.manualMatchHint { background: #eef2ff; border: 1px solid #c7d2fe; padding: 8px 10px; border-radius: 8px; font-size: 13px; }
.unregChip { margin-left: 6px; padding: 1px 8px; border-radius: 999px; border: 1px dashed var(--border, #9ca3af);
  font-size: 11px; color: var(--muted, #6b7280); }
.attentionChip { margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 11px; }
.attentionNote { margin: 4px 0 0; font-size: 12px; color: #92400e; }
```

- [ ] **Step 6: Type-check + smoke**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json` → exit 0.
Smoke (`npm run dev`): open `/captain/teams/[teamId]`, switch to **Unregistered**, add a name + mobile → row appears with an **Unregistered** chip. Enter a mobile that already has an account → the blue match hint appears.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/captain.ts apps/web/src/app/captain/actions.ts \
        apps/web/src/app/captain/teams/
git commit -m "feat(web): captains can add unregistered players + placeholder/attention chips"
```

---

## Task 8: Frontend — post-registration welcome card

**Files:**
- Modify: `apps/web/src/lib/captain.ts` (pending-link type + fetch)
- Create: `apps/web/src/app/profile/welcome-links.tsx`
- Modify: `apps/web/src/app/profile/page.tsx`
- Modify: `apps/web/src/app/profile/actions.ts`

**Interfaces:**
- Consumes: `GET /api/profile/me/pending-links`, `POST /api/team-members/{id}/acknowledge`, existing `leaveTeamAction`.
- Produces: `PendingLink` type, `getPendingLinks()`, `acknowledgeLinkAction`.

- [ ] **Step 1: Add type + fetch in `captain.ts`**

```typescript
export interface PendingLink {
  membershipId:  string;
  teamId:        string;
  sport:         BackendSport;
  teamName:      string;
  apartmentName: string;
  seasonName:    string | null;
}

export async function getPendingLinks(): Promise<PendingLink[]> {
  const res = await api.get<PendingLink[]>("/api/profile/me/pending-links");
  return res.ok ? res.data : [];
}
```

- [ ] **Step 2: Add `acknowledgeLinkAction` in `profile/actions.ts`**

```typescript
export async function acknowledgeLinkAction(membershipId: string): Promise<{ ok: boolean; message?: string }> {
  const res = await api.post(`/api/team-members/${membershipId}/acknowledge`, {});
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/profile");
  return { ok: true };
}
```

> Confirm `profile/actions.ts` already imports `api` and `revalidatePath`; `leaveTeamAction` is in this file (seen earlier at line 8) so both imports exist.

- [ ] **Step 3: Create `welcome-links.tsx` (client component)**

```tsx
"use client";
import { useState, useTransition } from "react";
import type { PendingLink } from "@/lib/captain";
import { acknowledgeLinkAction, leaveTeamAction } from "./actions";

export function WelcomeLinks({ initial }: { initial: PendingLink[] }) {
  const [links, setLinks] = useState<PendingLink[]>(initial);
  const [pending, start] = useTransition();
  if (links.length === 0) return null;

  function keep(id: string) {
    start(async () => { await acknowledgeLinkAction(id); setLinks((l) => l.filter((x) => x.membershipId !== id)); });
  }
  function leave(id: string) {
    start(async () => { await leaveTeamAction(id); setLinks((l) => l.filter((x) => x.membershipId !== id)); });
  }
  function keepAll() {
    start(async () => { await Promise.all(links.map((l) => acknowledgeLinkAction(l.membershipId))); setLinks([]); });
  }

  return (
    <section className="welcomeCard" aria-busy={pending} aria-live="polite">
      <h2 className="welcomeTitle">You&apos;ve been added to {links.length} team{links.length > 1 ? "s" : ""}</h2>
      <ul className="welcomeList">
        {links.map((l) => (
          <li key={l.membershipId} className="welcomeRow">
            <span className={`sportTag ${l.sport.toLowerCase()}`}>{l.sport}</span>
            <span className="welcomeTeam">{l.teamName} · {l.apartmentName}{l.seasonName ? ` · ${l.seasonName}` : ""}</span>
            <span className="welcomeActions">
              <button type="button" className="captainPrimaryBtn" disabled={pending} onClick={() => keep(l.membershipId)}>Keep</button>
              <button type="button" className="addCancelBtn" disabled={pending} onClick={() => leave(l.membershipId)}>Leave</button>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="welcomeKeepAll" disabled={pending} onClick={keepAll}>Keep all</button>
    </section>
  );
}
```

- [ ] **Step 4: Render it on `/profile`**

In `profile/page.tsx`, fetch pending links alongside the existing data and render the card at the top of the content:

```tsx
import { getPendingLinks } from "@/lib/captain";
import { WelcomeLinks } from "./welcome-links";
// inside the async component, alongside existing fetches:
const pendingLinks = await getPendingLinks();
// near the top of the returned JSX:
<WelcomeLinks initial={pendingLinks} />
```

- [ ] **Step 5: Add minimal styles** (append to the profile stylesheet):

```css
.welcomeCard { border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.welcomeTitle { font-size: 16px; font-weight: 600; margin: 0 0 10px; }
.welcomeRow { display: flex; align-items: center; gap: 10px; padding: 6px 0; flex-wrap: wrap; }
.welcomeActions { margin-left: auto; display: inline-flex; gap: 6px; }
.welcomeKeepAll { margin-top: 8px; background: none; border: none; color: #4338ca; cursor: pointer; font-size: 13px; }
```

- [ ] **Step 6: Type-check + smoke**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json` → exit 0.
Smoke: as the Task-5 auto-linked user, open `/profile` → welcome card lists the team(s). Click **Keep** → row disappears; reload → card gone (acknowledged). For another linked team click **Leave** → it's removed from the roster too.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/captain.ts apps/web/src/app/profile/
git commit -m "feat(web): one-time welcome card to keep/leave auto-linked teams"
```

---

## Task 9: Frontend — needs-attention badge on captain cards

**Files:**
- Modify: `apps/api/src/Epl.Application/Teams/Dtos/TeamMemberDtos.cs` (CaptainTeamDto)
- Modify: `apps/api/src/Epl.Application/Teams/Services/TeamMemberService.cs` (ListCaptainTeamsAsync)
- Modify: `apps/web/src/lib/captain.ts` (CaptainTeam)
- Modify: `apps/web/src/app/captain/page.tsx`

**Interfaces:**
- Produces: `CaptainTeamDto.NeedsAttentionCount` (int); `CaptainTeam.needsAttentionCount` (number).

- [ ] **Step 1: Add `NeedsAttentionCount` to `CaptainTeamDto`** (append to the record, line ~13):

```csharp
    int     MaxRosterSize,
    int     NeedsAttentionCount);
```

- [ ] **Step 2: Compute it in `ListCaptainTeamsAsync`**

Read the current method (around lines 27-46). After loading the captain's teams + members, gather all placeholder mobiles across those teams, do one `users.Users` lookup, and count per team the placeholders whose mobile matches a registered user:

```csharp
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
```

> Match the actual variable name the method uses for the loaded teams and its member-include strategy; the key addition is the `registered` lookup and the trailing count argument.

- [ ] **Step 3: Build** → `dotnet build apps/api/Epl.Api.slnx -c Release -nologo` → Build succeeded.

- [ ] **Step 4: Add `needsAttentionCount` to `CaptainTeam` in `captain.ts`**

```typescript
  maxRosterSize:      number;
  needsAttentionCount: number;
```

- [ ] **Step 5: Render the badge in `captain/page.tsx`**

In the team card (`captainCardTop`, near the `rosterFullChip`):

```tsx
  {t.needsAttentionCount > 0 && (
    <span className="attentionChip" title="Placeholders need attention">
      {t.needsAttentionCount} needs attention
    </span>
  )}
```

Add `.attentionChip` to `captain.css` if not shared with the roster stylesheet (same amber style as Task 7 Step 5).

- [ ] **Step 6: Type-check + smoke**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json` → exit 0.
Smoke: create the C8-conflict situation from Task 5 Step 4 (a placeholder that couldn't link). On `/captain` that team card shows **"1 needs attention"**; opening the team shows the row's amber note.

- [ ] **Step 7: Full verify + commit**

Run: `npm run verify` → all three checks pass.
```bash
git add apps/api/src/Epl.Application/Teams/Dtos/TeamMemberDtos.cs \
        apps/api/src/Epl.Application/Teams/Services/TeamMemberService.cs \
        apps/web/src/lib/captain.ts apps/web/src/app/captain/page.tsx \
        apps/web/src/app/captain/captain.css
git commit -m "feat: surface placeholders that need a captain's attention"
```

---

## Self-Review

**Spec coverage:**
- §3 schema → Task 1. §3.2 indexes/CHECK → Task 1. §3.3 welcome state fields → Task 1.
- §4.1 add-time matching → Task 4. §4.2 register-time linking + C8 + cache → Task 5.
- §5.1 widened request + validator → Tasks 3, 4. §5.2 pending-links/acknowledge → Task 6.
- §6.1 segmented add UX + match-back → Task 7. §6.2 chips → Tasks 7, 9. §6.3 welcome card → Task 8. §6.4 captain badge → Task 9. §6.5 a11y → Tasks 7, 8.
- §7 edge cases: already-added (Task 4), match-back (Task 4), C8 conflict (Task 5), email registration no-op (Task 5), roster-full counts placeholders (Task 4), transfer excludes placeholders (Task 7).
- §8 out-of-scope items: none implemented. ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases". The `>` notes are explicit "verify this against the existing method" instructions, each naming what to confirm — not deferred work.

**Type consistency:** `TeamMemberDto` shape (11 fields incl. `IsPlaceholder`, `NeedsAttention`) is defined in Task 3 and consumed by `ToMemberDto`/`ToPlaceholderDto` in Task 4 and the frontend `TeamMember` in Task 7. `PendingLinkDto` (6 fields) defined in Task 3, produced by `ListPendingLinksAsync` (Task 6), consumed as `PendingLink` in Task 8. `LinkedFromPlaceholder`/`AcknowledgedAt` set in Task 5, read in Task 6 query (Task 2) and acknowledge (Task 6). `NeedsAttentionCount` defined Task 9 backend + frontend. Repo methods `ListActivePlaceholdersByMobileAsync` / `ListPendingLinksByUserAsync` declared Task 2, consumed Tasks 5/6. Consistent.

**Known limitation carried from spec:** email registrations don't auto-link (no phone captured) — documented in Task 5 Step 4 and spec §7/§8.
