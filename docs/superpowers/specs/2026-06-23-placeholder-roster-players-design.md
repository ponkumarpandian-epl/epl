# Placeholder (unregistered) roster players — design

> **Status:** approved design, ready for implementation planning.
> **Date:** 2026-06-23
> **Builds on:** [plan/10-team-captain-roster.md](../../../plan/10-team-captain-roster.md) (decisions C1–C10, A1–A6).
> **Goal:** let a captain add a player to their roster by name + mobile **before that player has an account**, and automatically link the placeholder to the real account when the player registers later.

---

## 1. Problem

Today a captain can only add **registered** users to a roster — `AddMemberAsync` rejects anyone without an `AppUser` (`TeamMemberService.cs:56-57`). Real teams are assembled faster than every player signs up, so captains are blocked on other people registering. We want captains to add "placeholder" players immediately, and have those placeholders resolve into real memberships once the player registers — with no manual re-linking and without breaking the existing one-team-per-SeasonGame rule (plan C8).

---

## 2. Decisions (locked during brainstorming)

| # | Decision | Choice |
|---|---|---|
| P1 | Match key between a placeholder and a future account | **Mobile number** (E.164). Captured at add-time, matched against `AppUser.PhoneNumber` on registration. |
| P2 | Storage shape | **Extend `TeamMember`**: make `UserId` nullable, add `PlaceholderName` + `PlaceholderMobile`. No new entity, no shadow `AppUser` rows. |
| P3 | Registration-time link behaviour | **Auto-link** matching placeholders, then show the new user a **one-time, non-blocking welcome card** to keep/leave each (consent without friction). |
| P4 | Conflict at link time (would violate C8) | **Skip** the conflicting link, keep it as a placeholder, and **flag it to the captain**. Never silently corrupt the invariant. |
| P5 | Mobile required for a placeholder | **Yes.** A name-only placeholder can never auto-link, so it's out of scope. |
| P6 | Roster accounting | Placeholders **count toward `maxRosterSize`** and **can never be captain** (captaincy requires a real `UserId`). |

---

## 3. Data model

### 3.1 `TeamMember` changes
```csharp
public Guid? UserId { get; set; }            // was Guid — now nullable
public AppUser? User { get; set; }           // was non-null

public string? PlaceholderName   { get; set; }   // NEW — set iff UserId is null
public string? PlaceholderMobile { get; set; }   // NEW — E.164, set iff UserId is null
```

**Row invariant:** exactly one identity is present —
- *real member:* `UserId != null`, both placeholder fields `null`;
- *placeholder:* `UserId == null`, `PlaceholderName != null`, `PlaceholderMobile != null`.

Enforced by a DB `CHECK` constraint:
```sql
CONSTRAINT CK_TeamMembers_Identity CHECK (
    (UserId IS NOT NULL AND PlaceholderName IS NULL AND PlaceholderMobile IS NULL)
 OR (UserId IS NULL     AND PlaceholderName IS NOT NULL AND PlaceholderMobile IS NOT NULL)
)
```

### 3.2 Indexes / constraints (`TeamMemberConfig.cs`)
- Existing unique `(TeamId, UserId) WHERE Status = 1` — keep; it now naturally ignores placeholder rows (UserId NULL).
- **New** partial unique `(TeamId, PlaceholderMobile) WHERE Status = 1 AND UserId IS NULL` — can't add the same number as a placeholder twice on one team.
- `User` relationship `IsRequired(false)` (was implicitly required); delete behavior stays `Restrict`.
- `PlaceholderName` maxLength 80, `PlaceholderMobile` maxLength 20.

### 3.3 Welcome-card state
To drive the one-time card without guessing "first login", mark the linked rows:
```csharp
public bool            LinkedFromPlaceholder { get; set; }   // NEW — true when registration converted a placeholder
public DateTimeOffset? AcknowledgedAt        { get; set; }   // NEW — null until the user keeps/leaves it
```
The welcome card shows memberships where `LinkedFromPlaceholder == true && AcknowledgedAt == null`. "Keep" stamps `AcknowledgedAt`; "Leave" runs the existing leave path.

### 3.4 Migration
- Add four columns (`PlaceholderName`, `PlaceholderMobile`, `LinkedFromPlaceholder`, `AcknowledgedAt`), make `UserId` nullable, add the `CHECK` constraint and the new partial unique index.
- **No backfill** — existing rows are all real members and satisfy the invariant (UserId set, placeholder fields null, `LinkedFromPlaceholder=false`).
- Follows the project rule that migrations auto-apply on startup. The `CHECK` + new index must be created **after** the column adds in the same `Up()`.
- ⚠ Avoid the FK cascade-path trap (see the captain FK fix on this branch): no new `SET NULL`/cascade FK to `AspNetUsers` is introduced here, so error 1785 is not a risk.

---

## 4. Matching engine (two symmetric triggers)

A small reusable helper resolves "does this mobile belong to a registered user?" and runs the C8 guard.

### 4.1 Add-time (captain submits the manual-add form)
In a new `AddPlaceholderAsync` path (or a branch of `AddMemberAsync`):
1. Normalise the entered mobile to E.164 (reuse `IdentifierParser.ToE164Mobile`).
2. **If it matches an existing `AppUser.PhoneNumber`** → do not create a placeholder; fall through to the **registered** add for that user (runs the existing `already_member`, C8 `already_on_a_team`, and `roster_full` checks). The API tells the UI "resolved to registered user X" so it can confirm.
3. **Else** create a placeholder row (`UserId=null`, name+mobile set), after the same roster-full and placeholder-duplicate checks.

### 4.2 Register-time (`AuthService.RegisterAsync`, mobile registrations only)
After `AddToRoleAsync(user, Roles.Player)` (`AuthService.cs:49`) and **before** sign-in:
1. Only when `kind == Mobile` (email registrations capture no phone → nothing to match; documented limitation).
2. Find all `Active` placeholder rows where `PlaceholderMobile == user.PhoneNumber`.
3. For each, in a deterministic order (oldest `AddedAt` first):
   - Run the C8 check (`ExistsActiveInSameSeasonGameAsync(user.Id, seasonGameId, teamId)`), also guarding against linking two placeholders that share a SeasonGame within this same batch.
   - **No conflict** → convert in place: `UserId = user.Id`, clear `PlaceholderName`/`PlaceholderMobile`, `LinkedFromPlaceholder = true`, `AcknowledgedAt = null`.
   - **Conflict** → leave as placeholder (it stays flagged via §6).
4. Single `SaveChangesAsync`. Invalidate the teams cache family (captain name/roster counts are cached) via `cache.RemoveByPrefix(CacheKeys.TeamsFamilyPrefix)`.
5. Log one line per converted row (actor = the registrant) for the audit trail.

This is symmetric: add-time handles "already registered", register-time handles "registers later". A placeholder can never coexist with the matching real account on the same team.

---

## 5. API surface

### 5.1 Captain — manual add
Reuse `POST /api/teams/{teamId}/members` with a widened request DTO:
```csharp
// AddTeamMemberRequest — exactly one identity branch is provided
record AddTeamMemberRequest(
    Guid?   UserId,             // registered add (existing)
    string? PlaceholderName,    // NEW — manual add
    string? PlaceholderMobile,  // NEW — manual add
    string? ShirtNumber,
    string? Position);
```
- Validator (FluentValidation, auto-run): require **either** `UserId` **or** (`PlaceholderName` + valid E.164 `PlaceholderMobile`), never both/neither.
- Response `TeamMemberDto` gains `IsPlaceholder` (bool) and a `NeedsAttention` (bool) flag (§6); the existing `phoneMasked`/`fullName` fields carry the placeholder name and entered (unmasked) mobile for placeholder rows.

### 5.2 Player — welcome card
```
GET   /api/profile/me/pending-links      # memberships LinkedFromPlaceholder && AcknowledgedAt == null
POST  /api/team-members/{id}/acknowledge # "Keep" — stamps AcknowledgedAt
# "Leave" reuses existing POST /api/team-members/{id}/leave
```

### 5.3 No new admin endpoints
Admins resolve flagged placeholders through the existing per-team override surfaces (add/remove members). Conflict visibility is read-only (§6) and needs no new write path.

---

## 6. UX

Reuses existing roster-manager tokens (`addPanel`, `rosterTable`, `captainBadge`, `modalCard`, `captainPrimaryBtn`, `sportTag`) — no new visual language.

### 6.1 Captain add-flow — `apps/web/src/app/captain/teams/[teamId]/roster-manager.tsx`
Add a segmented toggle to the `AddPlayer` panel:
- **Registered** (default) — today's debounced search, unchanged.
- **Unregistered (manual)** — a small form with **visible labels** (not placeholder-only):
  - Full name * (required)
  - Mobile * (required, `type="tel"`, helper: "+91… — used to link them when they register")
  - Shirt # (optional) · Position (optional)
- **Inline validation on blur** (mobile format, name required) — not per keystroke.
- **Add-time match-back:** on mobile blur, if the number belongs to a registered user, collapse to a confirm row — *"This number belongs to **Ravi Kumar** — add them as a registered player instead?"* + **Add Ravi** button.
- **Submit feedback:** loading → row appears → success toast `aria-live="polite"`, auto-dismiss 3–5s.

### 6.2 Roster table
- Placeholder rows show a neutral **"Unregistered"** chip (text + dotted avatar — not color-only) next to the name; mobile column shows the captain-entered number.
- Flagged rows (a registered user exists for the mobile but C8 blocked auto-link) show an amber **"Needs attention"** chip + inline note: *"Ravi registered but is already on another Cricket team. Remove here or contact admin."*
- Placeholder rows never show the **C** badge and are excluded from the Transfer-captaincy candidate list.

### 6.3 Welcome card — `/profile`
Non-blocking dismissible card at the top of `/profile` when `GET /api/profile/me/pending-links` returns rows:
```
👋 You've been added to N teams
  • Smashers — Cricket · Tower 4     [ Keep ]  [ Leave ]
  • Eagles — Volleyball · Tower 4    [ Keep ]  [ Leave ]
            [ Keep all ]   [ Dismiss ]
```
- **Keep** → `acknowledge`; **Leave** → existing leave; **Keep all / Dismiss** → acknowledge all.
- Per-action loading→success; card disappears once nothing is unacknowledged. Skippable, never traps the user.

### 6.4 Captain conflict surface
No new page. The `/captain` team card gets a small amber **"N needs attention"** badge when a team has flagged placeholders, pulling the captain into the roster page where §6.2 explains and resolves it. Badge clears on resolution.

### 6.5 Accessibility
Segmented toggle keyboard-navigable with `aria-pressed`; chips convey state with text + shape (not color alone); toasts use `aria-live="polite"` and don't steal focus; match-back/conflict notes use `role="status"`.

---

## 7. Edge cases & invariants

| Case | Behaviour |
|---|---|
| Captain enters a mobile already on the roster as a placeholder | Blocked by the new partial unique index → friendly `already_added` error. |
| Captain enters a mobile belonging to a registered user | Resolved to a registered add at add-time (§4.1), subject to C8. |
| Two captains add the same mobile as placeholders to two teams in the **same** SeasonGame | Allowed at add-time (no account yet). On registration, the **first** links; the second is flagged (P4 / §4.2). |
| User registers by **email** (no phone) | No auto-link (no key). Documented limitation; they can be added as a registered player normally afterwards. |
| Placeholder converted, user later leaves | Existing leave path; row goes `Removed`, frees the slot. |
| Captaincy transfer | Candidate list already filters to real Active members; placeholders excluded by construction (`IsCaptain` can't be true). |
| Roster full of placeholders | Same `roster_full` guard — placeholders count toward `maxRosterSize`. |

---

## 8. Out of scope (v1)
- Name-only placeholders (no mobile).
- Email-based linking / linking a phone added after registration.
- Captain-initiated invite SMS/WhatsApp to the placeholder (plan 10 open-question #6).
- Bulk import of placeholders.
- Notifying the captain in real time when a placeholder links (they'll see the chip change on next roster view).

---

## 9. Affected code (map for the plan)
**Backend**
- `Epl.Domain/Entities/TeamMember.cs` — nullable `UserId`, 4 new fields.
- `Epl.Infrastructure/Persistence/Configurations/TeamMemberConfig.cs` — optional User, new index, CHECK.
- New migration under `Epl.Infrastructure/Persistence/Migrations`.
- `Epl.Application/Teams/Dtos/TeamMemberDtos.cs` — widened `AddTeamMemberRequest`, `TeamMemberDto.IsPlaceholder/NeedsAttention`, pending-link DTO.
- `Epl.Application/Teams/Validators/` — add/extend validator for the either-or rule.
- `Epl.Application/Teams/Services/TeamMemberService.cs` — add-time branch, roster DTO mapping for placeholders, flag computation, acknowledge.
- `Epl.Application/Auth/Services/AuthService.cs` — register-time linking hook.
- `Epl.Application/.../ITeamMemberRepository` + EF repo — placeholder-by-mobile query, pending-links query.
- Controllers: `TeamMembersController` (request shape), `ProfileController` (pending-links), `TeamMembershipController` (acknowledge).

**Frontend**
- `lib/captain.ts` — types (`isPlaceholder`, `needsAttention`), pending-links fetch.
- `app/captain/teams/[teamId]/roster-manager.tsx` — segmented toggle + manual form + match-back + chips.
- `app/captain/actions.ts` — `addPlaceholderAction` (or widen `addMemberAction`).
- `app/captain/page.tsx` — needs-attention badge on team cards.
- `app/profile/page.tsx` + new welcome-card component + `app/profile/actions.ts` — acknowledge action.

**Verification:** `npm run verify` (secret scan + web type-check + API release build). No automated tests in repo; manually smoke-test add-placeholder → register-with-matching-mobile → welcome card → keep/leave, and the C8 conflict path.
