## What

Lets a team captain add a player by **name + mobile before that player has an account**, and **auto-links** the placeholder to the real account when the player later registers with the same mobile. Closes the gap where captains were blocked on every player signing up first.

Design docs: [spec](docs/superpowers/specs/2026-06-23-placeholder-roster-players-design.md) · [plan](docs/superpowers/plans/2026-06-23-placeholder-roster-players.md)

## How it works

- **Schema** — `TeamMember.UserId` is now nullable; new `PlaceholderName` / `PlaceholderMobile` / `LinkedFromPlaceholder` / `AcknowledgedAt`. A row is *either* a real member *or* a placeholder, enforced by a DB `CK_TeamMembers_Identity` CHECK + a partial unique index on `(TeamId, PlaceholderMobile)`. Migration applied to dev DB.
- **Two symmetric match points** (mobile is the key):
  - *Add-time* — if the entered mobile already belongs to a registered user, they're added as a real member instead of a placeholder.
  - *Register-time* — on a mobile registration, matching placeholders convert to real memberships, **skipping any that would violate the one-team-per-SeasonGame rule (C8)**. Linking is wrapped so it can never break registration.
- **Player side** — a one-time, non-blocking welcome card on `/profile` to **Keep** (acknowledge) or **Leave** each auto-added team; `GET /api/profile/me/pending-links` + `POST /api/team-members/{id}/acknowledge`.
- **Captain side** — segmented *Registered / Unregistered* add toggle, manual name+mobile form with add-time match-back hint, an "Unregistered" chip, and a **"needs attention"** badge/count for placeholders that registered but couldn't auto-link.

## Endpoints / contracts

- `POST /api/teams/{teamId}/members` widened to accept `{ placeholderName, placeholderMobile }` (XOR with `userId`, validated).
- `TeamMemberDto.UserId` is now nullable; adds `isPlaceholder` / `needsAttention`. `CaptainTeamDto` adds `needsAttentionCount`. Frontend updated in the same PR.

## Quality

- Built via subagent-driven development: each of 9 tasks independently implemented + spec/quality reviewed; a final whole-branch review (no must-fix) plus fixes for 3 should-fix items (registration-linking now exception-safe, `GetRosterAsync` N+1 removed, roster sort restored).
- `npm run verify` green (secret scan, web type-check, API release build). 2 benign pre-existing CS8602 nullable-deref warnings on eager-loaded navigations remain.

## Not yet done / follow-ups

- **End-to-end runtime smoke** (register → link → welcome card; C8-conflict path) still needs a manual pass against a live app.
- Known limitation: **email** registrations don't auto-link (no mobile captured at signup) — documented in the spec.
- Deferred nits: tidy the 2 CS8602 warnings; consider an `IUserDirectory` repo method instead of EF queries in the Application layer if more accrue.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
