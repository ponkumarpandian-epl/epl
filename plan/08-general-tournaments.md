# 08 — General Tournaments (badminton, non-EPL-season)

> **Status:** plan only — no code changes until approved.
> **Goal:** add a separate "Tournaments" surface for one-off badminton events (Men's Doubles / Women's Doubles / Mixed Doubles / Singles) that runs *outside* the EPL annual season.
> **Concept reference (idea only, NOT styling):** [playmatches.com/bengaluru/tournaments](https://www.playmatches.com/bengaluru/tournaments). We keep our existing navy/gold/crimson dark theme and design tokens (see [02-design-system.md](./02-design-system.md)).
> **Mockup:** [08-general-tournaments-mockup.html](./08-general-tournaments-mockup.html) — open in a browser for a visual walkthrough.

---

## Why this is separate from EPL Season

| | **EPL Season** (existing) | **General Tournament** (new) |
|---|---|---|
| Cadence | **Once a year** (Season 2 = 2026) | **Frequent** — could be monthly / one-off |
| Scope | A whole season, multiple sports | **One** event, **one** sport (badminton today; extensible) |
| Registration unit | **Apartment team** (12-player squad) | **Individual** (singles) or **pair** (doubles) |
| Categories | "Men's", "Women's" — string on `SeasonGame` | First-class entity (singles / men's doubles / women's doubles / mixed) — each with its own bracket |
| Home placement | Hero + sport cards on `/` | New top-level surface at `/tournaments` |
| Schedule | One coordinator team, sponsored | Smaller, sometimes paid-entry, lighter ops |

Trying to model both as the same entity bends `Season` out of shape and breaks the public home page assumptions (one active season, three sports). Keep them as **peer concepts** that share two things: a) the master `Game` row (Badminton), and b) a **reusable bracket subsystem** (see §5).

---

## 1. Decisions (lock these before iteration starts)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Tournament vs. extend Season | **New `Tournament` entity** | Different cadence + different registration unit. Generalising Season pollutes the EPL home-page contract. |
| D2 | Category modelling | **`TournamentCategory` row** per format (Singles / MD / WD / XD) | Each category has its own draw, own entry list, own venue/time. String columns ("Men's & Women's") aren't enough. |
| D3 | Registration unit | **`TournamentEntry`** — 1 or 2 player slots (free-text + optional `AppUser` FK) | Mirrors how players actually sign up — no apartment requirement. Logged-in users get their slot prefilled. |
| D4 | Bracket subsystem | **Polymorphic, parent-agnostic** (`ParentType` + `ParentId`) — can attach to either a `TournamentCategory` or, later, a `SeasonGame` | Single piece of code/UI maintained for both EPL Season fixtures and one-off tournaments. |
| D5 | Supported draw formats (v1) | **Single Elimination** + **Round Robin** + **Group → Knockout** | Covers ~95% of badminton tournaments. Double-elim is rare; defer. |
| D6 | Match scoring (badminton) | Best-of-3 games to 21 (rally point), per-game scores stored as JSON | Standard BWF format. JSON keeps the schema simple. |
| D7 | Public bracket visibility | **Hidden until admin publishes** the bracket | Admin can iterate on seeding; users only see the final draw. |
| D8 | URL strategy | `/tournaments` (list), `/tournaments/[slug]` (detail), `/tournaments/[slug]/[category]` (category bracket + registration) | Clean, shareable. |
| D9 | Admin URL | `/admin/tournaments` (peer to `/admin/seasons`) | Stays out of the EPL admin tree to keep mental models separate. |
| D10 | Tournament-level registration toggle | Per-category `RegistrationOpen` flag **+** tournament-level master toggle | Lets admin close MD while keeping WD open, or close the whole thing. |
| D11 | Match scoring rules — granularity & defaults | **Per-`BracketRound`** with a bracket-level default it inherits from. Default profile (BWF standard badminton): `BestOf = 3`, `PointsToWin = 21`, `WinByMargin = 2` (deuce), `PointCap = 30` (golden point — first to 30 wins regardless of margin). League games may override to `BestOf = 1`, semis/finals stay at 3 or move to 5. | Real tournaments routinely use shorter league formats and a longer final. Per-round granularity covers it without per-match overrides 95% of the time. The rules act as the **authoritative feed** to the future scoring feature; the umpire console reads them to decide when a game ends and when a match ends. |

If any of D1–D11 is wrong, fix it here before iteration begins.

---

## 2. Domain model

### 2.1 New entities

```
Game (existing)
  └─ master: Badminton  ◀─ both EPL and Tournaments reference this
       ▲
       │
  ┌────┴────────────────────────────────────────────────────────────────┐
  │                                                                     │
SeasonGame (existing)                                          Tournament (NEW)
  └─ Teams                                                       └─ TournamentCategories (NEW)
                                                                       └─ TournamentEntries (NEW)

                  ┌─── Bracket (NEW, polymorphic) ──────┐
                  │   ParentType: "SeasonGame" |        │
                  │              "TournamentCategory"   │
                  │   ParentId:  Guid                   │
                  └─────────────────────────────────────┘
                              │
                              ├── BracketParticipants (NEW)
                              ├── BracketRounds (NEW)
                              └── Matches (NEW)
                                     └── MatchGames (NEW, per-game score)
```

### 2.2 Tables (SQL Server / EF Core)

```csharp
// Tournament — one row per stand-alone event
class Tournament {
    Guid    Id;
    string  Name;                 // "Smashify Open March 2026"
    string  Slug;                 // "smashify-open-mar-2026"  (unique)
    Guid    GameId;               // FK → Game (currently Badminton only; field keeps future doors open)
    string? Tagline;
    string? Description;          // markdown ok
    string? Venue;
    DateTimeOffset? StartsOn;
    DateTimeOffset? EndsOn;
    DateTimeOffset? RegistrationDeadline;
    string? BannerImageUrl;
    string? WhatsAppGroupUrl;     // event-specific group
    int     EntryFeeRupees;       // 0 = free
    bool    RegistrationOpen;     // master switch
    bool    IsPublished;          // admin draft toggle (hidden from /tournaments while false)
    DateTimeOffset CreatedAt;

    ICollection<TournamentCategory> Categories;
    List<TournamentContact> Contacts;  // JSON array (re-use SeasonGameContact shape)
}

// TournamentCategory — one bucket per format inside a tournament
class TournamentCategory {
    Guid    Id;
    Guid    TournamentId;
    string  Name;                 // "Men's Doubles", "Singles", "Mixed Doubles", "Women's Doubles"
    CategoryFormat Format;        // enum: Singles | MensDoubles | WomensDoubles | MixedDoubles
    int     PlayersPerEntry;      // 1 (singles) or 2 (doubles) — derived from Format
    int     MinEntries;           // admin-set floor; bracket can't be generated below this
    int     MaxEntries;           // hard cap; registration closes when hit
    int     EntryFeeRupees;       // 0 inherits from Tournament; non-zero overrides
    bool    RegistrationOpen;     // per-category toggle (also gated by Tournament.RegistrationOpen)
    DateTimeOffset CreatedAt;

    ICollection<TournamentEntry> Entries;
    Bracket? Bracket;             // navigation; one bracket per category at most
}

enum CategoryFormat { Singles = 1, MensDoubles = 2, WomensDoubles = 3, MixedDoubles = 4 }

// TournamentEntry — a player or pair signed up for a category
class TournamentEntry {
    Guid    Id;
    Guid    TournamentCategoryId;

    // Slot 1 (always present)
    string  Player1Name;
    string  Player1Mobile;
    Guid?   Player1UserId;        // FK → AppUser, nullable (logged-out registration allowed)

    // Slot 2 (null for singles)
    string? Player2Name;
    string? Player2Mobile;
    Guid?   Player2UserId;

    string? TeamLabel;            // optional display name "Smashers", "Court Kings"
    int?    Seed;                 // admin-assigned seed (1=best); null = unseeded
    EntryStatus Status;           // Pending | Confirmed | Withdrawn
    DateTimeOffset CreatedAt;
}

enum EntryStatus { Pending = 1, Confirmed = 2, Withdrawn = 3 }
```

### 2.3 Reusable bracket subsystem (shared with SeasonGame later)

```csharp
class Bracket {
    Guid    Id;
    string  ParentType;           // "TournamentCategory" or "SeasonGame"
    Guid    ParentId;
    DrawFormat Format;            // SingleElimination | RoundRobin | GroupKnockout
    bool    IsPublished;          // hidden from public until true
    DateTimeOffset CreatedAt;

    // ── Default scoring rules (inherited by rounds that don't override) ──
    // See MatchRules below; broken out as columns for queryability.
    int     DefaultBestOf;        // 1 / 3 / 5      (e.g. 3 = best-of-3 games)
    int     DefaultPointsToWin;   // 21 BWF · 15 / 11 for short formats
    int     DefaultWinByMargin;   // 2 = "deuce, win by 2";  1 = "no deuce"
    int?    DefaultPointCap;      // 30 = golden point cap;  null = no cap (play forever at deuce)

    ICollection<BracketParticipant> Participants;
    ICollection<BracketRound> Rounds;
    ICollection<Match> Matches;
}
enum DrawFormat { SingleElimination = 1, RoundRobin = 2, GroupKnockout = 3 }

// Optional per-round override. NULL columns mean "inherit from Bracket.Default*".
// Lets league rounds be best-of-1 while SF/Final stay best-of-3 in the same bracket.
class BracketRound {
    Guid    Id;
    Guid    BracketId;
    int     OrderIndex;
    string  Name;
    string? GroupLabel;

    int?    BestOf;               // override OR null = inherit
    int?    PointsToWin;
    int?    WinByMargin;
    int?    PointCap;             // -1 sentinel = "explicitly no cap" (so we can distinguish from "inherit")
}

class BracketParticipant {
    Guid    Id;
    Guid    BracketId;
    string  DisplayName;          // "Anand / Pradeep" — denormalised so the bracket can render without joining back to entries
    int?    Seed;
    Guid?   SourceEntryId;        // FK → TournamentEntry (when bracket parent is a Category)
    Guid?   SourceTeamId;         // FK → Team (when bracket parent is a SeasonGame)
    bool    IsBye;                // a bye slot
}

class Match {
    Guid    Id;
    Guid    BracketId;
    Guid    RoundId;
    int     SlotIndex;            // position within round (top-to-bottom in the visual draw)
    Guid?   ParticipantAId;
    Guid?   ParticipantBId;
    Guid?   WinnerParticipantId;  // null until result recorded
    MatchStatus Status;           // Pending | Scheduled | InProgress | Complete | Walkover
    DateTimeOffset? ScheduledAt;
    string? Court;                // "Court 2"
    Guid?   NextMatchId;          // for SingleElim: where the winner advances

    // ── Rules SNAPSHOT (taken from Round/Bracket at match creation time) ──
    // Frozen so historical scoring stays coherent even if admin changes
    // the bracket-level defaults mid-tournament. The umpire console / scoring
    // engine reads these — not the parent Bracket/Round directly.
    int     RulesBestOf;
    int     RulesPointsToWin;
    int     RulesWinByMargin;
    int?    RulesPointCap;

    ICollection<MatchGame> Games; // per-game scores
}
enum MatchStatus { Pending = 1, Scheduled = 2, InProgress = 3, Complete = 4, Walkover = 5 }

class MatchGame {
    Guid    Id;
    Guid    MatchId;
    int     GameIndex;            // 1, 2, 3, …, up to Match.RulesBestOf
    int     ScoreA;
    int     ScoreB;
    // (no per-game RulesSnapshot — the Match snapshot governs every game in it)
}

// ── Resolution helper, lives in Epl.Application/Brackets/ ──
// Used by BracketService when materialising a Match: walks Round → Bracket
// defaults, picks first non-null value for each column, copies onto Match.Rules*.
record MatchRules(int BestOf, int PointsToWin, int WinByMargin, int? PointCap) {
    public static MatchRules Resolve(BracketRound round, Bracket bracket) => new(
        BestOf:       round.BestOf       ?? bracket.DefaultBestOf,
        PointsToWin:  round.PointsToWin  ?? bracket.DefaultPointsToWin,
        WinByMargin:  round.WinByMargin  ?? bracket.DefaultWinByMargin,
        PointCap:     round.PointCap == -1 ? null
                    : round.PointCap     ?? bracket.DefaultPointCap);
}
```

### 2.4 Migration strategy

- All new tables added in **one** migration: `AddTournamentsAndBrackets`.
- **No changes** to existing `Game`, `Season`, `SeasonGame`, `Team` rows. The Tournament tree is purely additive.
- `Bracket.ParentType` uses a discriminator string (not an enum) so adding `"PlayerLadder"` later is non-breaking.
- Indexes:
  - `Tournament(Slug)` unique
  - `TournamentCategory(TournamentId, Format)` unique
  - `TournamentEntry(TournamentCategoryId, Player1Mobile)` unique (block double-registrations)
  - `Bracket(ParentType, ParentId)` non-unique (a SeasonGame might have multiple historical brackets; tournament categories will typically have one)
  - `Match(BracketId, RoundId, SlotIndex)` unique

---

## 3. API surface

### 3.1 Public (anonymous)

```
GET  /api/tournaments                          # list published, with optional ?status=upcoming|in-progress|completed
GET  /api/tournaments/{slug}                   # detail + categories summary + counts
GET  /api/tournaments/{slug}/categories/{cat}  # category detail + entries + bracket (if published)
GET  /api/brackets/{bracketId}                 # bracket view (read-only) — works for both Tournament & Season-Game brackets
```

### 3.2 Player (authenticated, any role)

```
POST /api/tournaments/{slug}/categories/{cat}/entries   # register self (and partner) — returns the new entry
DELETE /api/tournament-entries/{entryId}                # withdraw own entry before deadline
```

### 3.3 Admin (AdminOnly policy)

```
GET    /api/admin/tournaments                          # list ALL (incl. unpublished)
POST   /api/admin/tournaments                          # create draft
PUT    /api/admin/tournaments/{id}                     # update
POST   /api/admin/tournaments/{id}/publish             # flip IsPublished
DELETE /api/admin/tournaments/{id}                     # admin-only, only allowed if no entries

POST   /api/admin/tournaments/{id}/categories          # add a category
PUT    /api/admin/tournament-categories/{id}           # update
DELETE /api/admin/tournament-categories/{id}           # only if no entries

GET    /api/admin/tournament-categories/{id}/entries   # full entry list
PUT    /api/admin/tournament-entries/{id}/seed         # set seed
PUT    /api/admin/tournament-entries/{id}/status       # Confirmed / Withdrawn

# Bracket subsystem (works for any ParentType)
POST   /api/admin/brackets                             # { parentType, parentId, format }  → generates skeleton
POST   /api/admin/brackets/{id}/seed                   # auto-seed from category entries (snake / random / seeded)
PUT    /api/admin/brackets/{id}                        # update format / participants
POST   /api/admin/brackets/{id}/publish                # flip IsPublished
DELETE /api/admin/brackets/{id}                        # only if no matches with results

PUT    /api/admin/matches/{id}/schedule                # { scheduledAt, court }
PUT    /api/admin/matches/{id}/result                  # { games: [{scoreA, scoreB}, ...] }
                                                       # validated against Match.Rules* before being accepted
                                                       # auto-advances winner into NextMatch when SingleElim

# Scoring rules (D11) — bracket default + per-round overrides
PUT    /api/admin/brackets/{id}/rules                  # { bestOf, pointsToWin, winByMargin, pointCap }
                                                       # bracket default; cascades to any Match that hasn't started
PUT    /api/admin/bracket-rounds/{id}/rules            # same body, nullable per field, null = inherit
                                                       # PointCap -1 means "explicitly no cap"
                                                       # Both endpoints refuse when any Match in scope is already InProgress / Complete
                                                       # (would mess with the snapshot's audit trail).
```

### 3.4 Response shape (key DTOs)

```typescript
// Public list item
TournamentSummaryDto { id, slug, name, gameName, startsOn, endsOn, venue, entryFeeRupees, categoriesCount, entriesCount, status }
// status derived: upcoming | open | closed | in-progress | completed

// Public detail
TournamentDetailDto { ...summary, description, bannerImageUrl, whatsAppGroupUrl, contacts, categories: TournamentCategorySummaryDto[] }

// Bracket render
BracketViewDto {
  id, format, isPublished,
  participants: { id, displayName, seed }[],
  rounds: { id, name, orderIndex, matches: MatchDto[] }[]
}
MatchDto { id, slotIndex, status, scheduledAt, court, participantA, participantB, winnerParticipantId, games: { scoreA, scoreB }[] }
```

---

## 4. Admin UX (mockup §A, §B, §C)

### A. Tournaments list — `/admin/tournaments`

- Table-of-cards layout: each tournament shows banner thumb, name, dates, categories chips, registration status, entry counts.
- Filter bar: status (draft / published / closed), date range, sport.
- CTA: **+ Create Tournament**.

### B. Create / Edit tournament — `/admin/tournaments/new` and `/admin/tournaments/[id]`

Single page with collapsible sections (not a multi-step wizard — admin sees everything at once):

1. **Basics** — Name, Slug (auto-generated, editable), Description, Banner image.
2. **When & Where** — StartsOn, EndsOn, RegistrationDeadline, Venue.
3. **Money & Comms** — EntryFeeRupees (tournament default), WhatsAppGroupUrl, Contacts (re-use the SeasonGameContact JSON shape).
4. **Categories** — repeatable section: add Singles / MD / WD / XD with min/max entries, per-category fee override.
5. **Status toggles** — `RegistrationOpen` (master), `IsPublished`.

### C. Manage tournament — `/admin/tournaments/[id]/[category]`

Tabbed panel inside the tournament detail:

- **Entries** — table of registered entries: Seed input, Player1, Player2, Mobile, Status (Confirmed/Withdrawn), Created. Bulk "Confirm all" button.
- **Bracket** — the **shared BracketBuilder** component:
  - Choose format (SingleElim / RoundRobin / GroupKnockout) — disabled once any match has a result.
  - "Auto-seed" button (snake / random / by seed).
  - Drag-and-drop seeding (desktop) / tap-to-edit slot (mobile).
  - **Scoring rules panel** — bracket default (`BestOf`, `PointsToWin`, `WinByMargin`, `PointCap`) plus a per-round table to override (e.g. League = best-of-1 to 21, SF = best-of-3, Final = best-of-5). Locked once any match in the round is InProgress / Complete (would corrupt the per-match `Rules*` snapshot's audit trail). Quick-presets: **"BWF standard"** (3 / 21 / 2 / 30) · **"Short league"** (1 / 15 / 2 / 21) · **"Marathon final"** (5 / 21 / 2 / 30).
  - Per-match: schedule date/court, record per-game scores, set walkover. Scoring input is validated against the match's frozen `Rules*` snapshot — entering 22-19 in a "to 21, win by 2" game is rejected with an inline hint.
  - **Publish** button — once flipped, the public bracket view goes live.
- **Settings** — category name, min/max, fee override, RegistrationOpen toggle, delete (only if no entries).

---

## 5. Public UX (mockup §D, §E, §F, §G)

### D. Tournaments hub — `/tournaments`

- Big hero strip: "Tournaments" eyebrow + headline.
- Filter: status pills (Upcoming · Open · In Progress · Completed). Sport (Badminton today — pill is forward-compat).
- Card grid: each card shows banner, name, dates, venue, categories chips, "X entries" counter, primary CTA based on status:
  - `Upcoming` → "Details"
  - `Open` → **"Register"** (gold pill, primary)
  - `In Progress` → "Live draws"
  - `Completed` → "Results"
- Empty state: friendly card with "No tournaments yet — check back soon."

### E. Tournament detail — `/tournaments/[slug]`

- Banner header with name, dates, venue, registration deadline countdown.
- **Category tabs** (segmented control) — Singles | Men's Doubles | Women's Doubles | Mixed Doubles. URL deep-links: `/tournaments/[slug]/[category]`.
- Active category panel shows:
  - Entries counter (e.g. "12 / 16 spots filled").
  - **Register CTA** (gold) — opens the registration form drawer.
  - Public entry list (collapsed by default, "Show all" reveals).
  - **Bracket / Fixtures** section — visible only when `Bracket.IsPublished`.
- Sticky footer on mobile: Register CTA stays visible until user scrolls past entries cap.

### F. Bracket view — read-only, mobile-aware (mockup §F)

- **Desktop:** classic left-to-right tree. Rounds as columns. Each match is a card with two participant rows + score badge if complete. Lines connect winner to next round. Horizontal scroll inside a contained viewport (not the page).
- **Mobile:** stacked rounds — one round per "slide" with swipe / dot-pagination. Each match is a full-width card. No tiny text or shrunk tree.
- **Round Robin:** a results matrix on desktop, a fixtures list grouped by date on mobile, plus a standings table below.
- **Group Knockout:** league phase (matrix / list) + knockout phase (tree). User scrolls between them.

### G. Registration form (drawer / page)

**Logged-in users never re-enter their own identity.** If `/api/auth/me` returns a profile, Slot 1 (Player 1) is read from the server — name, mobile, and `userId` are stamped onto the entry directly. The form shows an "identity card" block ("Registering as **<full name>** · +91…") with a "Not you? Switch accounts →" link, and the Player 1 input fields are not rendered. If the logged-in user has no `phoneNumber` on their profile, the mobile field appears so they can supply one (their name still comes from the profile).

Fields per CategoryFormat (anonymous flow shown — logged-in flow drops Slot 1 inputs entirely):

| Format | Slot 1 (anonymous only) | Slot 2 |
|---|---|---|
| Singles | Name (req), Mobile (req) | — |
| Men's Doubles | Name (req), Mobile (req) | Partner Name (req), Partner Mobile (req) |
| Women's Doubles | same as MD | same as MD |
| Mixed Doubles | same as MD, with gender label "(F)" / "(M)" | same as MD |

**Trust boundary:** when a logged-in user submits, the server action overwrites any client-supplied Slot 1 fields with the authenticated profile values. The client never gets to decide whose name lands in `Player1Name` — it's whoever the cookie identifies. This avoids a class of "I'm logged in but I'll type my friend's name" support cases.

Submit → returns the new `TournamentEntry`. On success, show a confirmation drawer with the tournament's WhatsApp group link and the entry's position in the queue.

---

## 6. Reusable bracket components

> **Design reference (archive).** An earlier iteration of this app had a working knockout bracket + fixture board. The archived components at `C:\src\_archive\badminton-team-event-app\2026-05-22\apps\web\src\` are the starting point — same vocabulary, same SVG geometry, ported to the new schema. Files worth pulling forward:
> - `components/hub/bracket-view.tsx` — knockout SVG (160×70 cards · 60px column gap · 20px row gap · left accent bar per sport · connector paths drawn as `<path>` between adjacent rounds).
> - `components/hub/fixture-board.tsx` — status-filtered match-card list (All · 🔴 Live · Upcoming · Completed). Each card has sport badge + round + status pill + home/away short codes + score + venue/court.
> - `components/ui/match-row.tsx` — compact one-line match cell, used in standings drawers.
> - `lib/types.ts` — `BracketRound`, `BracketMatch`, `MatchCard`, `MatchStatus`, `PoolSnapshot`, `StandingEntry`, `TeamCard`. Align the new server DTOs with these names so the existing components plug in with minimal rewriting.

What changes from the archive:
- The components were **client-only** with hardcoded sample data (`src/data/badminton.ts` etc.). Replace data sources with the new `GET /api/brackets/{id}` and `GET /api/tournaments/{slug}/categories/{cat}` endpoints.
- The archive used `homeTeam` / `awayTeam` string names; we now have `BracketParticipant.DisplayName` — drop-in compatible.
- Add a **mobile-stacked** layout the archive lacked: at `<=760px`, render rounds as vertical stacks with swipe pagination instead of horizontal scroll on a 160px-wide card.

Frontend (all under `apps/web/src/components/bracket/`):

- `<BracketView bracketId>` — public read-only renderer. Pulls `GET /api/brackets/{id}`. Auto-detects desktop tree vs. mobile stacked layout. **Ports the archive's SVG geometry** (CARD_W=160, CARD_H=70, COL_GAP=60, ROW_GAP=20) and per-sport `--accent` colour.
- `<BracketBuilder bracketId>` — admin editor. Wraps `<BracketView>` and adds: format selector, seed drag-and-drop, per-match scheduling/result modal, publish toggle.
- `<MatchCard match>` — single match cell, used by both. Modes: `view` (read-only), `edit` (record result), `compact` (mobile list). Status pill copies the archive's tone mapping (live → red, completed → "FT", upcoming → time-of-day).
- `<FixtureBoard fixtures>` — full archive port: status-tab filter + cards, scoped to one bracket or one category.
- `<StandingsTable poolSnapshot>` — round-robin standings, also reusable for league-phase displays. Uses the archive's `StandingEntry` shape (rank · P · W · L · pts · gameDiff · qualification chip).

Backend (under `Epl.Application/Brackets/`):

- `IBracketService` — `CreateBracketAsync(parentType, parentId, format)`, `SeedAsync(bracketId, strategy, participantIds)`, `RecordResultAsync(matchId, games)`, `PublishAsync(bracketId)`, `UpdateRulesAsync(bracketId | roundId, rules)`. Returns `Result<T>` per project convention.
- A small `BracketGenerator` strategy class per `DrawFormat` (SingleElim, RoundRobin, GroupKnockout) — handles slot/match creation, BYE placement, advancement linkage. On match creation, calls `MatchRules.Resolve(round, bracket)` and copies the result onto the new Match's snapshot columns.
- An `IMatchScoreValidator` (pure function) — given `MatchRules` and a candidate list of `(scoreA, scoreB)` games, returns either `Result.Ok(winnerSide)` or `Result.Fail(reason)`. Used by `RecordResultAsync` and by the future scoring feature's umpire console for every point entered. Covers: per-game completion (`scoreX >= PointsToWin && |a - b| >= WinByMargin`, OR `scoreX == PointCap`), match completion (best-of-N), and the deuce / golden-point edge cases.

> **Reusability for the scoring feature.** The future live-scoring / umpire console reads `Match.Rules*` (frozen snapshot) and calls `IMatchScoreValidator` to decide when to flash "Game over" or "Match point". Today's `RecordResultAsync` admin endpoint is the same flow with a one-shot batch input instead of a stream of point taps — same validator, same rule snapshot, same advancement logic.

Once these are in, attaching a bracket to an EPL `SeasonGame` is one DI line plus an admin link from the existing season page — **no schema change** because `Bracket` is polymorphic by design.

> **Captain & team-roster management** is a cross-cutting feature shared with EPL Season teams — tracked separately in [10-team-captain-roster.md](./10-team-captain-roster.md). It's a dependency for any team-based draw built on top of this bracket subsystem, and §4.5 of that plan describes the **public team progress page** (`/teams/[teamId]`) that consumes `<FixtureBoard>` / `<BracketView>` / `<StandingsTable>` from this section — every component here needs to accept a `highlightParticipantId` prop so the team's path / "our row" can be highlighted.

---

## 7. Frontend routes

| Route | Surface | Auth |
|---|---|---|
| `/tournaments` | Tournaments hub | Public |
| `/tournaments/[slug]` | Tournament detail (Singles tab default) | Public |
| `/tournaments/[slug]/[category]` | Category tab deep-link | Public |
| `/tournaments/[slug]/[category]/register` | Registration form (or drawer-overlay over detail) | Auth required |
| `/admin/tournaments` | Admin list | Admin |
| `/admin/tournaments/new` | Create | Admin |
| `/admin/tournaments/[id]` | Edit + categories | Admin |
| `/admin/tournaments/[id]/[category]` | Entries + Bracket builder | Admin |

Primary-nav additions:
- Public: insert **"Tournaments"** between Sports and Gallery.
- Admin sidebar: insert **"Tournaments"** under Seasons.

---

## 8. Iteration plan

Each iteration ends with a working slice deployed to dev. Suggested chunking:

| Iteration | Scope |
|---|---|
| **T-1** | DB migration + `Tournament` + `TournamentCategory` + admin CRUD UI for creating a tournament with categories. **No** registration yet. Public `/tournaments` list shows published tournaments as read-only cards (no Register CTA). |
| **T-2** | `TournamentEntry` table + public registration form (logged-in or anonymous, mobile + name). Per-category counters update. Admin Entries tab with seed + status. |
| **T-3** | Bracket subsystem skeleton — `Bracket`, `BracketParticipant`, `BracketRound`, `Match`. Admin can create a SingleElimination bracket, drag-seed, and publish it. Public bracket view (desktop tree). |
| **T-4** | Mobile bracket view (stacked rounds, swipe). Per-game score entry. Walkover handling. Winner auto-advancement. |
| **T-5** | RoundRobin format + standings table. GroupKnockout format (league + tree composite). |
| **T-6** | Polish — registration deadline countdown, sticky mobile CTA, empty states, e-mail/WhatsApp share buttons on results. **Concurrent-scheduling soft check:** when an admin sets a match's court + start time, warn (non-blocking toast) if another match on the same court overlaps the proposed slot. Server returns the conflicts; admin can override. |
| **T-7** | **Scoring rules** (D11) — Bracket default columns + BracketRound override columns + Match snapshot. `MatchRules.Resolve` + `IMatchScoreValidator`. Admin bracket-builder gains the rules panel with the three quick-presets and a per-round override table. Result-entry validates against the snapshot. **Unblocks the future live-scoring / umpire console feature** (separate plan), which reads the same snapshot point-by-point. |

Each iteration is independently shippable — the public site doesn't break if a later iteration isn't done.

---

## 9. Open questions / risks

1. **Anonymous registration?** EPL allows it for team registration. For tournament entries, should we also allow it (free-text Player1/Player2 names) or require login? Default proposal: **allow anonymous**, mark such entries Pending until an admin confirms.
2. **Partner discovery.** For doubles, do we want a "find a partner" feature where solo players can post and pair up? Out of scope for v1 — defer.
3. **Payments.** Entry fees are stored but currently informational only. UPI/payment-gateway integration is a separate stream.
4. **Multi-sport tournaments.** Today `Tournament.GameId` allows any sport, but only badminton is in scope. The `TournamentCategory.Format` enum is badminton-shaped (Singles/MD/WD/XD). If we ever do cricket-only tournaments, we'll need either a new format set or a generic category that doesn't pre-suppose doubles.
5. **Walkovers and retirements.** Should we model retirement (a player concedes mid-match) separately from walkover (no-show)? `MatchStatus.Walkover` covers no-shows; retirements can be added later if needed.
6. **Concurrent scheduling.** No DB constraint stops an admin from scheduling two matches on the same court at the same time — a hard constraint is overkill for an apartment-league tournament where last-minute rescheduling is the norm. Scheduled as a **soft check in T-6**: when saving a match, the API returns the list of overlapping matches (same court, time windows intersect) and the admin UI surfaces them as a warning toast with a "Save anyway" affordance. Resolution: soft-warn, do not block.

---

## 10. Out of scope (for the v1 of this feature)

- Live scoring (umpire console). Match results are admin-entered after the match.
- Player ELO / leaderboard across tournaments.
- Bracket export to PDF.
- Email notifications. (WhatsApp is the de-facto channel.)
- Payment gateway integration.
