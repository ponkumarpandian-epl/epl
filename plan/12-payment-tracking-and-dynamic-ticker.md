# 12 — Payment tracking + dynamic hero ticker

> **Status:** plan only — no code changes until approved.
> **Two related features** bundled because both surface team data and both need a new (small) server endpoint. Can ship independently.

---

## Feature A — Per-team payment tracking on the admin teams page

### Goal

Admins need to see at a glance which registered teams have paid the entry fee, who collected the money (which coordinator), and toggle the paid flag inline. Captains never see this data. No bulk-mark in v1.

### Data model

Two new fields on the `Team` entity:

| Field | Type | Default | Notes |
|---|---|---|---|
| `PaymentCompleted` | `bool` | `false` | Single source of truth for "is this team paid up" |
| `PaidTo` | `string?` (max 80) | `null` | Free-text name of the coordinator who collected. Nullable because legacy rows + brand-new unpaid rows have no value. |

**Optional, recommended:** add `PaidAt` (`DateTimeOffset?`) too — auto-set server-side when `PaymentCompleted` flips true. Useful for "show me everything paid since Monday" reports later, costs nothing now.

**Migration:** standard EF Core migration adds three nullable columns; auto-applies on startup per project convention. No backfill needed — all existing teams start at `PaymentCompleted = false`. Captains can't observe the field so they won't see a change.

### Backend endpoint

```
PATCH /api/teams/{teamId}/payment
Auth:  AdminOnly policy
Body:  { "paid": bool, "paidTo": string | null }
Returns: 200 + updated TeamRow DTO; 404 if team missing
```

Service: `TeamService.SetPaymentAsync(teamId, paid, paidTo)` — load tracked entity, set `PaymentCompleted = paid`, set `PaidTo = paidTo?.Trim()`, set `PaidAt = paid ? DateTimeOffset.UtcNow : null`, save, return DTO. Follows the same `Result<T>` pattern as the per-game registration toggle from PR #5.

### DTO additions

`TeamRow` (admin list) gains:

```typescript
paymentCompleted: boolean;
paidTo:           string | null;
paidAt:           string | null;  // ISO
```

Public-facing `TeamDto` (anywhere else) does **not** gain these — payment is admin-only and must not leak to captain-facing pages.

### Column layout (1440px desktop)

A 7-column table is already wide. Adding two more without thinning is too much horizontal scroll on a 1440px laptop. Recommended consolidation:

| Old columns | New columns |
|---|---|
| `Sport · Team · Season · Apartment · Captain · Mobile · Registered` | `Sport · Team · Season · Apartment · Captain (name + mobile in stacked sub-line) · Registered · **Payment**` |

- **Merge Captain + Mobile into one cell** — name on row 1, mobile on row 2 in a smaller mono font. Same pattern already used for Apartment name + address.
- **Drop the Apartment-address sub-line below 1080px** — only the apartment name remains. Address moves to a hover tooltip on `cellApartment:hover`.
- **Add the Payment column** at the far right (action-y columns belong on the right; admins scan left-to-right for identity, right-to-left for state).
- **Row order unchanged** — paid + unpaid teams interleave as today (no auto-sort to "unpaid on top" — interrupts pagination and is easy to misread).

Resulting column widths roughly: `80 / 180 / 100 / 220 / 180 / 110 / 200` = 1070 px content + paddings = comfortably fits 1280+ viewport.

### ASCII mockups — one row in each state

**Unpaid (default — what the admin first sees):**

```
┌────────┬───────────────┬─────────┬─────────────────────┬──────────────────────┬───────────┬────────────────────────────┐
│ ⬤ Crick │ Hercules      │ S2 26   │ GM Infinite E-City  │ Jay Sharma           │ 24 May    │ ╭─────────────────────────╮│
│  -et    │               │         │ Hulimangala, Anekal │ +91 88804 89685      │ 06:52     │ │ [ Mark paid ]           ││
│        │               │         │                     │                      │           │ ╰─────────────────────────╯│
└────────┴───────────────┴─────────┴─────────────────────┴──────────────────────┴───────────┴────────────────────────────┘
                                                                                              ↑ ghost button, gold border,
                                                                                                fills sport accent on hover
```

**Paid (after admin clicks):**

```
┌────────┬───────────────┬─────────┬─────────────────────┬──────────────────────┬───────────┬────────────────────────────┐
│ ⬤ Crick │ Hercules      │ S2 26   │ GM Infinite E-City  │ Jay Sharma           │ 24 May    │ ╭─────────────────────────╮│
│  -et    │               │         │ Hulimangala, Anekal │ +91 88804 89685      │ 06:52     │ │ ✓ Paid · Christo      ⋯ ││
│        │               │         │                     │                      │           │ ╰─────────────────────────╯│
└────────┴───────────────┴─────────┴─────────────────────┴──────────────────────┴───────────┴────────────────────────────┘
                                                                                              ↑ green pill, "Paid to" name
                                                                                                inline, ⋯ menu → unpaid/edit
```

**Editing (admin clicked Mark paid OR edited paid-to):**

```
┌────────┬───────────────┬─────────┬─────────────────────┬──────────────────────┬───────────┬────────────────────────────┐
│ ⬤ Crick │ Hercules      │ S2 26   │ GM Infinite E-City  │ Jay Sharma           │ 24 May    │ ╭─────────────────────────╮│
│  -et    │               │         │ Hulimangala, Anekal │ +91 88804 89685      │ 06:52     │ │ Paid to: [Christo___▾] ✓││
│        │               │         │                     │                      │           │ ╰─────────────────────────╯│
└────────┴───────────────┴─────────┴─────────────────────┴──────────────────────┴───────────┴────────────────────────────┘
                                                                                              ↑ datalist of recent paid-to
                                                                                                names auto-suggests; Enter
                                                                                                or ✓ commits
```

### CSS class additions (append to `apps/web/src/app/teams/admin/admin.css`)

```css
/* ── Payment cell ───────────────────────────────────────────────────────── */
.cellPayment {
  text-align: right;
  white-space: nowrap;
  min-width: 200px;
}

/* Unpaid: ghost button, gold border, hover fills */
.paymentBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--gold-bright);
  background: transparent;
  color: var(--gold-bright);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  touch-action: manipulation;
}
.paymentBtn:hover { background: var(--gold-bright); color: var(--ink); }

/* Paid pill — green; row also gets .row-paid for the subtle tint */
.paymentPill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border-radius: var(--radius-pill);
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.4);
  color: rgba(52, 211, 153, 1);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.paymentPill .check { width: 12px; height: 12px; }     /* SVG checkmark */
.paymentPill .sep   { opacity: 0.5; margin: 0 4px; }
.paymentPill .paidTo { color: var(--bone); font-weight: 500; letter-spacing: 0 }

/* Whole-row subtle paid tint — left border the same green as the pill */
tr.row-paid { background: rgba(52, 211, 153, 0.025); }
tr.row-paid td:first-child { box-shadow: inset 3px 0 0 rgba(52, 211, 153, 0.6); }

/* Inline edit — small input + commit/cancel */
.paymentEditWrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.paymentEditWrap input {
  width: 120px;
  height: 32px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-strong);
  background: rgba(255,255,255,0.04);
  color: var(--bone);
  font-family: var(--font-mono);
  font-size: 12px;
}
.paymentEditWrap input:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 1px;
}
.paymentCommit { /* gold ✓ button, 32×32, aria-label="Save" */ }
.paymentCancel { /* ghost × button, 32×32, aria-label="Cancel" */ }

/* Pending (optimistic) — scoped to the row currently being mutated */
tr.is-pending .cellPayment::before {
  content: "";
  display: inline-block;
  width: 10px; height: 10px;
  margin-right: 6px;
  border-radius: 50%;
  border: 2px solid var(--gold-bright); border-top-color: transparent;
  animation: paymentSpin 0.7s linear infinite;
  vertical-align: middle;
}
@keyframes paymentSpin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  tr.is-pending .cellPayment::before { animation: none; opacity: 0.5; }
}

/* Mobile card mode — payment field gets its own labeled row */
@media (max-width: 760px) {
  td.cellPayment { text-align: left; min-width: 0; }
  td.cellPayment::before { /* injected via data-label="Payment" CSS pattern already in use */ }
}
```

### Interaction model

| Trigger | Behavior |
|---|---|
| Click **Mark paid** button | Inline edit appears with empty `Paid to` input focused. Captain hits Enter or clicks ✓ — optimistic switch to Paid state. Cancel reverts. |
| Click **⋯ menu** on a paid pill | Two items: "Edit paid to" (re-opens inline edit, prefilled) · "Mark unpaid" (immediate optimistic flip back to unpaid; confirm dialog skipped per the project's "we're not adding confirmation modals" pattern) |
| Inline edit Esc | Cancels, no API call |
| Inline edit empty + Enter | Treats as "Mark paid without recording who" — submits `paidTo: null`. Pill renders as `✓ Paid` with no name appended. |
| Network failure | Rollback the optimistic state, show inline error in the cell ("Couldn't save — retry") |

**Edit affordance choice — single click, not hover-reveal.** Hover doesn't work on touch; revealing actions only on hover is a known a11y trap. The button is always visible at 36×36px, well within the 44px+ touch-target rule when combined with the cell padding.

**Datalist for `paidTo` autocomplete.** Use a `<datalist>` populated server-side with the distinct list of `PaidTo` values from the last 50 paid teams. Saves typing the same 5 coordinator names again. Trivial to add.

### Accessibility

- The Mark-paid button is `<button type="button" aria-label="Mark Hercules as paid">` — sport+team name in the label for screen-reader context.
- The paid pill is `<button type="button" aria-pressed="true" aria-label="Hercules paid by Christo. Open menu to edit or mark unpaid">`. `aria-pressed` toggles the screen-reader between "paid" and "unpaid" states.
- Inline-edit input has a hidden `<label>` ("Paid to") associated via `for`/`id`.
- The pending spinner row has `aria-busy="true"` on the `<tr>`.
- The status pill's text is the only signal a screen-reader needs — the green background is decorative.
- `<caption class="visually-hidden">` on the table summarising what columns mean (admins using SR are rare but real).

### Mobile card-mode

The existing `[data-label="Sport"]` etc. pattern already converts table rows to stacked cards below 760px. The new Payment cell follows the same pattern — it becomes a row labelled "Payment" with the same button-or-pill content, just full-width. No new CSS needed beyond what's above.

### Files to touch

| File | Change |
|---|---|
| [Team.cs](apps/api/src/Epl.Domain/Entities/Team.cs) | Add `PaymentCompleted`, `PaidTo`, `PaidAt` properties |
| [TeamConfig.cs](apps/api/src/Epl.Infrastructure/Persistence/Configurations/TeamConfig.cs) | `PaidTo` max length 80 |
| `AddTeamPaymentFields` new migration | Three nullable columns |
| `TeamService` + `ITeamService` | New `SetPaymentAsync` method |
| `TeamsController.cs` | New `PATCH /api/teams/{id}/payment` admin-only endpoint |
| Team list DTO returned by `/api/teams` | Include 3 new fields (admin endpoint only) |
| [teams/admin/page.tsx](apps/web/src/app/teams/admin/page.tsx) | Restructure column layout; merge Captain+Mobile; pass new fields to row |
| New `teams/admin/payment-cell.tsx` (client component) | Encapsulates the button → editing → pill state machine + optimistic flow |
| New `teams/admin/actions.ts` | Server action `markPaymentAction(teamId, paid, paidTo)` calling the PATCH endpoint |
| [teams/admin/admin.css](apps/web/src/app/teams/admin/admin.css) | Append the CSS block above |

---

## Feature B — Dynamic home-page hero ticker

### Goal

Replace the hardcoded ticker copy in [hero-banner.tsx:56-67](apps/web/src/components/home/hero-banner.tsx#L56-L67) with real-time numbers (team counts per sport, registration-closed flags). Server-rendered, no client fetch. Tone stays "stadium PA-system": short bursts, all-caps emphasis where it lands.

### Data layer

New endpoint:

```
GET /api/seasons/current/registration-stats
Auth:  AllowAnonymous, ResponseCache 60s
Returns: {
  seasonId, masterRegistrationOpen,
  sports: [
    { sport: "Cricket",    teamCount: 47, registrationOpen: true  },
    { sport: "Badminton",  teamCount: 12, registrationOpen: true  },
    { sport: "Volleyball", teamCount:  4, registrationOpen: false },
  ],
  totalTeams: 63
}
```

Single SQL query: `SELECT sg.Id, sg.GameId, COUNT(t.Id) FROM SeasonGames sg LEFT JOIN Teams t ON t.SeasonGameId = sg.Id WHERE sg.SeasonId = @currentSeason GROUP BY sg.Id, sg.GameId`. Cached for **60s** in `IMemoryCache` — registrations come in slowly enough that one-minute staleness is irrelevant.

[lib/seasons.ts](apps/web/src/lib/seasons.ts) gets a sibling helper `getCurrentSeasonStats()` wrapped in React `cache()` so server components render once per request.

### Message generation rules

The ticker text is **computed server-side** in the hero-banner component from the stats. Rules in priority order:

1. **If `masterRegistrationOpen === false`** → only one message repeats: "REGISTRATION CLOSED FOR SEASON 2 · CONTACT ORGANISERS". No per-sport stats, no team counts. This is the "we mean it" state.
2. **Per-sport closed messages** rank first: "VOLLEYBALL REGISTRATION CLOSED · 4 TEAMS LOCKED IN".
3. **Per-sport open + non-zero team count**: "CRICKET · 47 TEAMS REGISTERED · STILL ACCEPTING".
4. **Per-sport open + zero team count**: "BADMINTON REGISTRATION OPEN · BE THE FIRST TEAM" (positive, doesn't expose the empty count).
5. **Always last**: "JOIN THE WAITLIST AT E-CITYPREMIERLEAGUE.IN" — fills out the loop, calls action.

### Recommended layout: Option B — announcer-style (with verbs)

Option A (just facts: "Cricket: 47 teams · Badminton: 12 teams") reads like a dashboard. The hero ticker should sound like a PA system. Verbs + adjectives carry more energy in the half-second a user sees each phrase as it scrolls past.

### Example ticker windows (4 scenarios)

**Master ON, all 3 sports open, registrations happening:**
```
◀  ⚡ CRICKET · 47 TEAMS REGISTERED · STILL ACCEPTING  ●  BADMINTON · 12 TEAMS · WOMEN'S DOUBLES NEW THIS SEASON  ●  VOLLEYBALL · 4 TEAMS · SPOTS WIDE OPEN  ●  JOIN AT E-CITYPREMIERLEAGUE.IN  ▶
```

**Master ON, Cricket closed, others open:**
```
◀  🔒 CRICKET REGISTRATION CLOSED · 47 TEAMS LOCKED IN  ●  ⚡ BADMINTON · 12 TEAMS · STILL ACCEPTING  ●  VOLLEYBALL · 4 TEAMS · SPOTS WIDE OPEN  ●  JOIN AT E-CITYPREMIERLEAGUE.IN  ▶
```

**Master ON, Badminton has zero teams:**
```
◀  ⚡ CRICKET · 47 TEAMS REGISTERED  ●  BADMINTON REGISTRATION OPEN · BE THE FIRST TEAM  ●  VOLLEYBALL · 4 TEAMS · SPOTS FILLING  ●  JOIN AT E-CITYPREMIERLEAGUE.IN  ▶
```

**Master OFF:**
```
◀  🔒 REGISTRATION CLOSED FOR SEASON 2 · CONTACT ORGANISERS · 63 TEAMS IN THE BOOKS  ●  🔒 REGISTRATION CLOSED FOR SEASON 2 · CONTACT ORGANISERS · 63 TEAMS IN THE BOOKS  ▶
                                            (single message repeats — no per-sport stats while master is off)
```

### Visual treatment — closed vs open items

Within the ticker, **closed items** get a different visual signal so they don't read like "spots wide open":

| State | Visual |
|---|---|
| Open | gold `●` separator, bone-coloured text, sport name in `--gold-bright` |
| Closed | crimson `🔒` lock SVG (NOT emoji — inline SVG), text dimmed to `--bone-fade`, sport name in `--color-danger` |
| Call-to-action (URL) | cyan-accented, slightly bolder weight |

Sport names get their sport accent only when in the **open + count** message — e.g. CRICKET in cricket-accent gold, BADMINTON in badminton-accent green. Closed messages drop the sport accent so red/lock dominates.

### CSS additions (augment existing `.heroTicker / .heroTickerTrack`)

```css
/* Existing .heroTickerTrack already has marquee 35s linear infinite animation.
   Don't touch — these are decorations layered on top. */

.heroTickerItem        { display: inline-flex; align-items: center; gap: 8px; }
.heroTickerItem.is-open    { color: var(--bone); }
.heroTickerItem.is-closed  { color: var(--bone-fade); }
.heroTickerItem.is-cta     { color: var(--cyan-bright); font-weight: 600; }

.heroTickerSport          { font-weight: 700; letter-spacing: 0.18em; }
.heroTickerSport.cricket    { color: var(--sport-cricket-bright); }
.heroTickerSport.badminton  { color: var(--sport-badminton-bright); }
.heroTickerSport.volleyball { color: var(--sport-volleyball-bright); }
.heroTickerItem.is-closed .heroTickerSport { color: var(--color-danger); }

.heroTickerCount       { font-family: var(--font-mono); color: var(--bone); }
.heroTickerCount.is-closed { color: var(--bone-fade); text-decoration: line-through; text-decoration-color: rgba(232,54,66,0.4); }

.heroTickerLock        { width: 12px; height: 12px; color: var(--color-danger); }
.heroTickerSep         { color: var(--bone-fade); margin: 0 12px; }   /* the ● dot between messages */

/* Reduced-motion fallback — replace marquee with a 6s fade rotation */
@media (prefers-reduced-motion: reduce) {
  .heroTickerTrack {
    animation: none;
    transform: none;
    display: grid;
    grid-template-columns: 1fr;
  }
  .heroTickerTrack > :nth-child(n+2) { display: none; }   /* show only first copy */
  /* OR — if a single static line feels too dead — fade-rotate at 6s/message: */
  /* .heroTickerItem { animation: tickerFade 6s steps(1) infinite; } */
}
```

The marquee stays exactly as it is at 35s linear infinite — just decorated with item-level colors. The `prefers-reduced-motion` block kills the motion entirely and shows the first set of messages statically.

### Server-side composition

[hero-banner.tsx](apps/web/src/components/home/hero-banner.tsx) replaces the hardcoded `TickerCopy()`:

```typescript
// pseudo-code, not the final implementation
const stats = await getCurrentSeasonStats();
const messages = buildTickerMessages(stats);  // returns Array<{ kind, sport?, text, parts: ReactNode[] }>

<div className="heroTickerTrack">
  {messages.map(renderItem)}
  {messages.map(renderItem)}   {/* duplicate copy = continuous loop */}
</div>
```

`buildTickerMessages(stats)` is a pure function — 30 lines, easy to unit-test if/when tests come back. Lives in `lib/ticker-messages.ts`.

### Accessibility

- The whole ticker block stays `aria-hidden="true"` (already is) — screen readers don't get value from a marquee. Captain-facing data is on the sport cards below; the ticker is atmosphere.
- **Don't** make the ticker an `aria-live` region — constant updates would spam the screen reader.
- The lock icon is inline SVG, not emoji, per project rule.

### Empty / edge cases

| Scenario | Behavior |
|---|---|
| `getCurrentSeasonStats()` returns null (no active season) | Ticker shows the existing hardcoded "Live Updates: Season Coming Soon" fallback. Component degrades gracefully. |
| `totalTeams === 0` and master open | "REGISTRATION JUST OPENED · BE THE FIRST TEAM IN SEASON 2" — single message, no sport breakdowns yet. |
| New endpoint 5xx | Same null fallback — never break the home page over a stats endpoint. |
| `IMemoryCache` not yet warmed | First request computes + caches; ~80ms hit, fine. |

### Out of scope for v1 (worth flagging)

- "Registration opens June 1" countdown — needs a `Season.RegistrationOpensOn` field which doesn't exist.
- Per-sport apartment leaderboard ("Most teams: Esteem Emblem · 4") — extra query, leave for v2.
- Live update on team registration without page reload — would need SSE/websockets; deferred.

### Files to touch

| File | Change |
|---|---|
| `SeasonService` + `ISeasonService` | Add `GetRegistrationStatsAsync()` |
| `SeasonsController.cs` | Add `GET /api/seasons/current/registration-stats` endpoint, `ResponseCache(60)` |
| `lib/seasons.ts` | Add `getCurrentSeasonStats()` server helper with React `cache()` |
| New `lib/ticker-messages.ts` | Pure function `buildTickerMessages(stats) → Message[]` |
| [hero-banner.tsx](apps/web/src/components/home/hero-banner.tsx) | Replace hardcoded `TickerCopy` with rendered messages |
| [home.css](apps/web/src/components/home/home.css) | Append the CSS additions block above |

---

## Phased rollout

Both features are independent — ship A first, B second.

**Phase 1 — Payment tracking (Feature A):**
1. Backend migration + endpoint
2. Admin UI cells + optimistic flow
3. Test with one paid + one unpaid team
4. Deploy to prod, demo to organisers, gather feedback
5. (Optional v1.1) Datalist autocomplete for `PaidTo`

**Phase 2 — Dynamic ticker (Feature B):**
1. Backend stats endpoint + caching
2. `buildTickerMessages` pure function + unit tests if any are added by then
3. Replace `TickerCopy()` in hero-banner
4. Verify all 4 scenarios in dev + reduced-motion mode

Each phase = single PR, ~1 day's work each.

---

## Recommendation summary

- **Feature A:** ship the consolidated 7-column layout with merged Captain+Mobile cell, paid-state inline button, green pill, optimistic update — matches the existing per-game toggle pattern from PR #5.
- **Feature B:** go with Option B (announcer-style with verbs + lock icons for closed sports), 60s server cache, master-OFF override that suppresses per-sport messages.
