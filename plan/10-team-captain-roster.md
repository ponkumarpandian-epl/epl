# 10 — Team Captain role & player roster (EPL Season teams)

> **Status:** plan only — no code changes until approved.
> **Goal:** add a first-class **Captain** concept to EPL Season teams. Captains — and only captains — can build their team roster by searching for registered players and adding them. A player can be on multiple teams (one per sport per season). Applies to today's EPL Season teams (Cricket / Badminton / Volleyball) and to any future team-based tournament that hangs off a `SeasonGame` (or a new team-based `TournamentCategory`).
> **Related plans:** [08-general-tournaments.md](./08-general-tournaments.md), [09-database-diagram.html](./09-database-diagram.html).

---

## Why this matters

Today the `Team` entity stores `CaptainName` + `CaptainMobile` as free-text strings. There's no link from a team to its captain's `AppUser` row, no team-roster concept at all, and any logged-in user can in principle edit a team they didn't create. Three problems with that:

1. **No accountability for player adds.** The team that registered for Cricket has no list of who's actually playing.
2. **No way to surface "your team" in the player's own profile.** Players can't see "I'm on the Smashers — Cricket roster" without admin lookup.
3. **No authorization perimeter around team edits.** When we add player-add / squad-edit features, we need a captain perimeter — not just "any logged-in user".

This plan introduces:
- **`Team.CaptainUserId`** — a real FK to `AppUser`. Existing rows backfilled by matching `CaptainMobile` to `AppUser.PhoneNumber` where possible.
- **`TeamMember`** — new entity: one row per (Team, Player) link.
- A **captain-scoped authorization policy** for player-management endpoints.
- A **captain dashboard** at `/captain` showing all the teams a user captains, with roster management UI per team.

---

## 1. Decisions (lock these before iteration starts)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| C1 | Captain is per-team, not a global role | Add `Team.CaptainUserId` FK + `TeamMember.IsCaptain` flag; keep app-wide `Roles` enum (Admin / Player / Umpire) untouched | A user is "captain of Team X", not "Captain" full stop. Mirrors how real leagues work — same person can be a player on one team and captain of another. |
| C2 | Players must have AppUser accounts | **Yes** — captain can only add registered users; search is by name / mobile / email | The user explicitly asked for this. Drives sign-ups; gives every player a profile + skill levels. |
| C3 | Captain's team scope | **One per `SeasonGame`** — the same user can captain a Cricket team AND a Badminton team in the same season, distinct rosters | Mirrors the existing registration model (one Team per SeasonGame). |
| C4 | Roster size | Configurable per `SeasonGame` (default: Cricket = 12, Badminton = 4, Volleyball = 8, hard max 16) | Sport-dependent; admin sets on the SeasonGame row. |
| C5 | Player join workflow | Captain adds → player is **immediately on the team** (`Status = Active`). No invite / accept step | Keeps captain in the driver's seat and removes a step that always slowed real rosters down. If a player objects after the fact, they self-remove (C6). |
| C6 | Player can leave a team | **Yes**, any time before the season starts; flips the `TeamMember.Status` to `Removed` and frees the roster slot | Acts as the implicit "decline" too — anyone added against their will can leave with one tap. |
| C7 | Same player on multiple teams (different sports) | **Allowed.** A player can be on the Cricket roster AND the Badminton roster of the same season | They're different teams; the UNIQUE constraint is per-team, not per-player. |
| C8 | Same player on two teams in the same SeasonGame | **Blocked.** Enforced by app + a unique index on `(SeasonGameId, UserId)` derived through `TeamMember`+`Team` | A player can't be on two Cricket rosters at once. |
| C9 | Captain delegation | Captain can **transfer** captaincy to another team member (a `TeamMember.IsCaptain = true` row). Only one captain at a time per team | Real-world need (captain drops out, vice-captain takes over). |
| C10 | Admin override | Admins can override every captain decision (add/remove members, reassign captain) via existing admin surfaces | We already have `AdminOnly` policy; reuse it. |

If any of C1–C10 is wrong, fix it here before iteration starts.

---

## 2. Domain model

### 2.1 Schema changes

```csharp
// Team — add CaptainUserId, RosterSize derived from SeasonGame, keep
// CaptainName/CaptainMobile as denormalised display (legacy + signup snapshot)
class Team {
    Guid    Id;
    Guid?   SeasonGameId;
    Sport   Sport;
    string  Name;
    Guid    ApartmentId;

    string  CaptainName;            // (unchanged - display snapshot)
    string  CaptainMobile;          // (unchanged - display snapshot)
    Guid?   CaptainUserId;          // NEW - FK → AppUser, nullable for legacy rows

    Guid?   CreatedByUserId;        // unchanged - registrant (often == CaptainUserId)
    DateTimeOffset CreatedAt;

    ICollection<TeamMember> Members;
}

// NEW — roster row, one per (Team, User)
class TeamMember {
    Guid    Id;
    Guid    TeamId;                 // FK → Team
    Guid    UserId;                 // FK → AppUser
    bool    IsCaptain;              // exactly one true per Team
    TeamMemberStatus Status;        // Active | Removed   (set Active on add)
    string? ShirtNumber;            // optional (cricket: "11", badminton: blank)
    string? Position;               // optional ("Wicket-keeper", "Smash")
    Guid    AddedByUserId;          // FK → AppUser (usually = captain)
    DateTimeOffset AddedAt;
    DateTimeOffset? RemovedAt;
}
enum TeamMemberStatus { Active = 1, Removed = 2 }
```

### 2.2 Indexes & constraints

- `Team.CaptainUserId` — nullable, indexed (lookup "teams I captain").
- `TeamMember(TeamId, UserId)` UNIQUE WHERE `Status = Active` — same player can't be on the team twice. Removed rows kept as history (audit + ability to re-add).
- `TeamMember(UserId, Status)` — index for "teams I'm on".
- Application-enforced (no DB constraint, can't span tables cheaply): an `Active` `TeamMember` cannot exist for the same `UserId` across two `Team`s with the same `SeasonGameId`. Checked at `Add` time; captain sees an inline error if they try.

### 2.3 Backfill (one-off, in migration)

For existing Team rows:
1. Try to match `Team.CaptainMobile` (E.164) → `AppUser.PhoneNumber`. If a unique match exists, set `Team.CaptainUserId = that user`.
2. Create a `TeamMember` row for that user with `IsCaptain = true`, `Status = Active`, `AddedByUserId = self`, `AddedAt = Team.CreatedAt`.
3. Rows where no match is found stay as `CaptainUserId = NULL`. Admin can later run a console command (or manually edit) to attach a captain once the legacy registrant signs up.

The migration is idempotent — re-runs do nothing extra.

---

## 3. API surface

### 3.1 Captain (must be `Team.CaptainUserId == currentUser.Id` or Admin)

```
GET    /api/captain/teams                          # teams I captain
GET    /api/teams/{teamId}/members                 # public — anyone can view roster
POST   /api/teams/{teamId}/members                 # { userId, shirtNumber?, position? } — adds Active row immediately
PUT    /api/teams/{teamId}/members/{id}            # update shirt / position
DELETE /api/teams/{teamId}/members/{id}            # captain removes; soft-delete (Status = Removed)
PUT    /api/teams/{teamId}/captain                 # { newCaptainUserId } — transfer captaincy
```

### 3.2 Player (any authenticated user)

```
GET    /api/profile/me/teams                       # teams I'm on
POST   /api/team-members/{id}/leave                # leave a team I'm on (also covers "I don't want to be on this team")
```

### 3.2.1 Team progress (public — anyone can view a team's matches; some bits gated to members)

```
GET    /api/teams/{teamId}                         # public — header (name, sport, season, captain, apartment) + roster
GET    /api/teams/{teamId}/matches                 # public — upcoming + completed matches for the team
                                                   # ?status=upcoming|completed|live  optional filter
GET    /api/teams/{teamId}/bracket-position        # public — current standing / next-round opponent / pool standings
                                                   # shape depends on the bracket's format (SingleElim vs RoundRobin)
GET    /api/teams/{teamId}/whatsapp-link           # AUTH + active member only — masked URL to the SeasonGame WhatsApp group
```

The match list is derived: find every `BracketParticipant` row where `SourceTeamId = teamId`, then every `Match` referencing that participant. Group by bracket → round → date. Per-bracket DTO is the same `BracketViewDto` from plan 08 §3.4, plus an `ourParticipantId` marker so the UI can highlight "us" inside the tree.

### 3.3 Search (any authenticated user — needed by captains)

```
GET    /api/users/search?q=...&limit=10            # search by name / mobile / email
                                                   # returns { id, fullName, phoneNumberMasked, avatarUrl }
                                                   # never returns email or full mobile in the response
```

### 3.4 Admin override (existing `AdminOnly` policy)

```
PUT    /api/admin/teams/{teamId}/captain           # force-reassign captaincy
POST   /api/admin/teams/{teamId}/members           # bypass captain authorisation
DELETE /api/admin/teams/{teamId}/members/{id}      # bypass
```

### 3.5 Authorisation policy

```csharp
// New policy in Program.cs alongside AdminOnly / PlayerOrAdmin / UmpireOrAdmin
o.AddPolicy(AuthorizationPolicies.TeamCaptainOrAdmin, p => p.RequireAssertion(ctx =>
{
    // Admin always passes
    if (ctx.User.IsInRole(Roles.Admin)) return true;
    // Captain check is per-resource — the actual team lookup happens in the controller
    // (the policy gate just ensures the user is authenticated; controllers compare CaptainUserId).
    return ctx.User.Identity?.IsAuthenticated == true;
}));
```

The captain check itself is **resource-scoped** (need to look up `Team.CaptainUserId`), so we'll do that in the controller / minimal-API handler using a small `ITeamAuthService.AssertCaptainAsync(teamId, userId)` helper. The policy alone can't see the route parameter.

---

## 4. Captain dashboard UX

### 4.1 `/captain` — landing

Visible to any user who captains at least one team. Shows a card per team:
- Sport banner (Cricket/Badminton/Volleyball card image)
- Team name + apartment
- "X / Y players"
- CTAs: **Manage roster** · **Transfer captaincy** (small)

If the user captains zero teams, the page redirects to `/profile` with a hint card explaining how to become a captain (register a team).

### 4.2 `/captain/teams/[teamId]` — roster management

Two sections:

1. **Roster** — table of `Active` members
   - Columns: avatar · name · mobile (masked) · shirt # · position · joined · actions (remove)
   - Captain row is pinned at top with a small "C" badge.
   - Empty-state row encourages adding the first player.
2. **Add a player** — primary action
   - Search bar (debounced, hits `GET /api/users/search`) — results show name + masked mobile + sport-skill chips
   - On click → opens a small form for shirt # / position → submit → row appears in the Roster table **immediately** (no pending state, no waiting for the player to confirm).
   - Empty search shows a hint card: "Players must register to appear here. Share `/auth/register` with them."

### 4.3 `/profile` — player-side roster view

A new section on the existing profile page:

- **My teams** — list of `Active` `TeamMember` rows
  - Sport badge · team name · apartment · captain · season
  - Each row links to its **team progress page** (§4.5).
  - Actions: **Leave team** (with confirm modal) — covers both "I want to step down" and "I never asked to be on this".

### 4.4 Admin surface

Existing `/admin/teams` page (Team Registrations list) gets a new "Roster" column with a count + drawer.

### 4.5 `/teams/[teamId]` — Team progress page

**The thing a player asks for first**: *"What's my team doing this week?"* Public URL so it's shareable (parents can follow the kid's team, opposing captains can scout), with a couple of member-only bits gated by auth.

Vertical stack of sections, in this order:

1. **Header (always visible)**
   - Sport banner (cricket/badminton/volleyball card image, sport-tinted accent strip)
   - Team name + apartment + season label ("EPL Season 2 · 2026")
   - **Captain pill** — captain's name + small "C" badge
   - **You're on this team** chip — appears for the signed-in user if they're an Active member; for the captain it reads **"You captain this team"** with a link to `/captain/teams/[id]`
   - Roster summary count ("10 / 12 players")
   - **WhatsApp group** button — only renders for active members; opens `seasonGame.whatsAppGroupUrl` in a new tab (gated through the `whatsapp-link` endpoint so it's not exposed in HTML to non-members)

2. **Roster** (public, collapsible) — table of Active TeamMember rows
   - Avatar · name · shirt # · position
   - The signed-in user's row is highlighted with a thin gold border
   - Captain row is pinned to the top with the C badge

3. **Next match** (public, hero card) — the single nearest upcoming match
   - Big "vs. <opponent>" pairing with both sport-tinted accents
   - Date · time · venue · court (if scheduled)
   - Countdown chip when start is within 24h ("Starts in 4h 12m")
   - If the team isn't in any active bracket yet, this card shows a quiet "Awaiting fixtures" placeholder

4. **Upcoming fixtures** (public) — next 5 matches after "Next match"
   - Re-uses `<FixtureBoard>` from plan 08 §6 with `filter=upcoming`
   - Each card highlights *our* side in the team's accent colour so the user can scan quickly

5. **Recent results** (public) — last 5 completed matches
   - `<FixtureBoard>` with `filter=completed`, win/loss chip on each
   - W/L summary strip at top ("3 W · 1 L · 0 Tied")

6. **Bracket position / Standings** (public) — depends on the bracket format
   - **Single-elimination**: small inline bracket excerpt showing the team's path so far + next likely round opponent (re-uses `<BracketView>` from plan 08 with a `highlightParticipantId=ourId` prop that ports the archive's "live" border treatment to highlight our team's cards).
   - **Round-robin**: `<StandingsTable poolSnapshot>` (from plan 08 §6) with our row highlighted; "Currently ranked 2 / 6" badge above.
   - **Group → Knockout**: shows both the group standings and the knockout path, side by side on desktop, stacked on mobile.
   - If `bracket.IsPublished == false`, this section reads "Draw will be published once registration closes."

7. **Team announcements** *(future, out of scope v1)* — placeholder for captain notes / admin notes posted to a feed.

### 4.6 Where you land from where

```
/profile (My teams)         →  click a team       →  /teams/[teamId]
/captain (my captain teams) →  click a team       →  /captain/teams/[teamId] (manage)
                                                 (a "View team page" link in the header  →  /teams/[teamId])
/admin/teams                →  click a team       →  /admin/teams/[teamId] (admin override)
                                                 (a "Public page" link  →  /teams/[teamId])
public bracket view         →  click a participant→  /teams/[teamId]
home sport card             →  click coordinator  →  /tournaments/... (unchanged)
```

The captain dashboard and admin pages both link out to the public team page, so there's exactly one place every audience converges on for "what's this team's progress".

---

## 5. Frontend components

Under `apps/web/src/components/captain/`:

- `<TeamCard captainTeam>` — used on `/captain` landing.
- `<RosterTable members onRemove>` — table view of Active members.
- `<PlayerSearch onPick>` — debounced search → list of matching users → callback.
- `<TransferCaptaincyModal team currentMembers onPick>` — choose a new captain from existing Active members.

Under `apps/web/src/components/profile/`:

- `<MyTeamsList teams onLeave>` — list of teams the player is on, each row links to `/teams/[teamId]`.

Under `apps/web/src/components/team/` (used by the public team progress page):

- `<TeamHeader team currentUserMembership>` — banner, captain pill, "you're on this team" / "you captain this team" chip, WhatsApp button (member-gated).
- `<TeamRosterSummary members highlightUserId>` — collapsible roster, highlights `currentUserId`.
- `<NextMatchHero match teamAccent>` — full-width upcoming match card with countdown.
- `<TeamFixturesPanel teamId>` — wraps the existing `<FixtureBoard>` (plan 08) prefiltered to one team, with our-side highlighting.
- `<TeamBracketPosition bracketView ourParticipantId>` — wraps `<BracketView>` / `<StandingsTable>` with a `highlightParticipantId` prop ported from the archive's "live" border treatment.

All reuse existing design tokens (no new visual language).

---

## 6. Frontend routes

| Route | Surface | Auth |
|---|---|---|
| `/teams/[teamId]` | **Public team progress page** — roster + next match + fixtures + results + bracket position | Public · members see extras (WhatsApp link, "leave team" CTA) |
| `/captain` | Captain dashboard (list of teams I captain) | Auth required |
| `/captain/teams/[teamId]` | Manage one team's roster | Auth + captain of that team OR admin |
| `/profile` (extended) | My teams section (each row links to `/teams/[teamId]`) | Auth required |
| `/admin/teams/[teamId]/roster` | Admin override view (drawer over team list) | Admin |

Primary nav additions:
- Public + signed-in user: add **"Captain"** to the user menu (appears only if `userTeamsAsCaptain.length > 0` — server checks on render).

---

## 7. Iteration plan

| Iteration | Scope |
|---|---|
| **C-1** | DB migration: add `Team.CaptainUserId`, create `TeamMember` table, run backfill from `CaptainMobile → AppUser.PhoneNumber`. No UI yet. Smoke-test that existing team registrations still work. |
| **C-2** | API endpoints for the captain side: `GET /api/captain/teams`, `GET /api/teams/{id}/members`, `POST/DELETE /api/teams/{id}/members`. `ITeamAuthService` + `TeamCaptainOrAdmin` policy. |
| **C-3** | `/api/users/search` endpoint with name / mobile / email matching, plus masking. Rate-limited to `5 req/s` per user. |
| **C-4** | `/captain` and `/captain/teams/[teamId]` UI — list teams, roster table, add-player search. Adds land immediately. |
| **C-5** | Player side — `GET /api/profile/me/teams`, leave endpoint, `/profile` "My teams" section. |
| **C-6** | Transfer captaincy + admin overrides. |
| **C-7** | Polish — empty-state UX, captain "C" badge next to the captain's name everywhere, audit log of recent roster changes shown on `/captain/teams/[id]`. |
| **C-8** | **Public team progress page** `/teams/[teamId]` — header, roster, **Next match hero**, upcoming fixtures, recent results. Uses `<FixtureBoard>` from plan 08. Requires the bracket subsystem (plan 08 T-3+) to be live for fixtures to actually appear; ships with a graceful "Awaiting fixtures" empty state when no bracket exists yet. |
| **C-9** | Bracket-position section on `/teams/[teamId]` — embeds `<BracketView>` / `<StandingsTable>` with `highlightParticipantId` so the team's path through the draw is visible at a glance. WhatsApp-link gating (member-only). |

Each iteration is independently shippable — a captain can fully manage their roster after C-4; players gain visibility + leave in C-5; team progress lands in C-8/9 once the bracket subsystem from plan 08 has matches to show.

---

## 8. Open questions / risks

1. **Mobile number masking format.** Search results show `+91 9XXXX XX122` (last 3 digits). Sufficient for captain to disambiguate Ravi #1 from Ravi #2 without leaking PII. Confirm acceptable.
2. **Captain transfer when captain is the only member.** Edge case — should we force-add a second player before transfer is allowed? Default: yes, transfer requires at least one other confirmed member.
3. **Apartment lock.** Should team members be required to live in the same apartment as the team? EPL rules currently say yes (it's the whole point). Enforce on add? Default: warn, don't block — admin can override.
4. **Cross-season players.** A player on the Cricket Season 2 roster — do they auto-appear in Season 3 if the team re-registers? Default: no, every season is a fresh roster.
5. **Captain's player list — visibility.** Should other apartments be able to view a team's full roster, or just the captain's name? Default: roster is public (transparent for fairness).
6. **What if the search returns zero results?** Currently shows the share-`/auth/register` hint. Worth considering a "Invite by SMS" link that pre-fills the registration URL with the captain's team-token; out of scope for v1.
7. **Notify the player when added.** Since adds are immediate (C5), should the player get a WhatsApp/SMS ping the first time they appear on a team? Default: no — they'll see it on `/profile` next time they sign in, and the same channel surfaces a leave button. Revisit if this surprises people in practice.

---

## 9. Out of scope (v1)

- Cross-team transfers mid-season (treat as Leave + Add).
- Player skill recommendations to captain ("based on UserGameSkill ratings, here are the top 5 unsigned cricketers in your apartment"). Future.
- Vice-captain role. Just one captain; admin overrides.
- Push notifications. Invitations show on `/profile` next time the player visits.
