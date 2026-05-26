# 06 — Archive & cleanup

> **Important:** nothing in this file is "deleted" outright. Every file listed here is **first copied to a backup folder OUTSIDE the repo**, then removed from the working tree. The backup is the reference material for when tournaments / bracket / umpire / live-scoring features are rebuilt later.

## Archive location

```
C:\src\_archive\badminton-team-event-app\<yyyy-MM-dd>\
```

- A folder **outside** `C:\src\badminton-team-event-app`, so it is never picked up by `git status`, by Next.js builds, or by .NET solution scans.
- Date-stamped so a future re-archive (e.g. if we strip more later) doesn't overwrite the first.
- Mirror the original repo-relative path inside the archive (e.g. `apps/web/src/app/tournaments/...` ends up at `C:\src\_archive\badminton-team-event-app\<date>\apps\web\src\app\tournaments\...`).

## Archive procedure (Iteration 0)

Run in PowerShell from the repo root:

```powershell
$today  = Get-Date -Format 'yyyy-MM-dd'
$backup = "C:\src\_archive\badminton-team-event-app\$today"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

# Helper: copy then remove from working tree, preserving paths
function Archive-Path($rel) {
  $src = Join-Path (Get-Location) $rel
  if (-not (Test-Path $src)) { Write-Host "skip (missing): $rel"; return }
  $dst = Join-Path $backup $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
  Copy-Item -Recurse -Force $src $dst
  Remove-Item -Recurse -Force $src
  Write-Host "archived: $rel"
}

# --- Frontend (apps/web/src) ---
'apps/web/src/app/tournaments',
'apps/web/src/app/bracket',
'apps/web/src/app/umpire',
'apps/web/src/app/api/[...path]',
'apps/web/src/components/hub',
'apps/web/src/components/home',
'apps/web/src/components/bracket-page.tsx',
'apps/web/src/components/umpire-page.tsx',
'apps/web/src/data',
'apps/web/src/components/ui/match-row.tsx',
'apps/web/src/components/ui/sport-badge.tsx',
'apps/web/src/components/ui/sport-icons.tsx',
'apps/web/src/components/ui/stat-card.tsx',
'apps/web/src/components/ui/status-pill.tsx',
'apps/web/src/components/ui/tab-bar.tsx',
'apps/web/src/components/ui/section-heading.tsx',
'apps/web/src/components/ui/skeleton.tsx',
'apps/web/src/components/ui/panel.tsx',
'apps/web/src/components/ui/index.ts',
'apps/web/src/components/shell/nav-links.ts',
'apps/web/src/components/shell/theme-toggle.tsx',
'apps/web/src/lib/api.ts',
'apps/web/src/lib/types.ts',
'apps/web/src/lib/utils.ts',
# --- Backend (apps/api) — archive the in-memory store + seed before the .NET rewrite ---
'apps/api/Services/TournamentStore.cs',
'apps/api/Domain/ApiContracts.cs',
'apps/api/Domain/InternalModels.cs',
'apps/api/Domain/SeedData.cs',
'apps/api/Program.cs',
'apps/api/Epl.Api.csproj',
'apps/api/appsettings.json',
'apps/api/appsettings.Development.json' | ForEach-Object { Archive-Path $_ }

# Boilerplate Next.js svgs — archive too, even though they're tiny
'apps/web/public/file.svg',
'apps/web/public/globe.svg',
'apps/web/public/next.svg',
'apps/web/public/vercel.svg',
'apps/web/public/window.svg' | ForEach-Object { Archive-Path $_ }

# Design-system MASTER.md is renamed in place (NOT archived externally — it stays in repo as historical doc)
Rename-Item -Path 'design-system/MASTER.md' -NewName 'MASTER.archived-light.md'

Write-Host "`nArchive complete: $backup"
```

The script is idempotent on missing paths (`skip (missing): ...`) so it's safe to re-run after a partial archive.

## What gets archived

### Frontend (`apps/web/src/`)

| Path | Reason |
|---|---|
| `app/tournaments/` | Out of scope now; rebuilt later |
| `app/bracket/` | Out of scope now; rebuilt later |
| `app/umpire/` | Out of scope now; rebuilt later (live scoring) |
| `app/api/[...path]/` | Old generic proxy; replaced by `app/api/auth/[...slug]/route.ts` + the Next.js rewrite |
| `components/hub/` | Tournament hub views — reference for the rebuild |
| `components/home/` | The *old* feed home; replaced by new `components/home/*` per [03-frontend.md](./03-frontend.md). Keep as reference. |
| `components/bracket-page.tsx`, `components/umpire-page.tsx` | Page wrappers |
| `data/` (`badminton.ts`, `cricket.ts`, `volleyball.ts`, `index.ts`) | Seeded fixture data — reference for entity shape when features are rebuilt |
| `components/ui/match-row.tsx`, `sport-badge.tsx`, `sport-icons.tsx`, `stat-card.tsx`, `status-pill.tsx`, `tab-bar.tsx`, `section-heading.tsx`, `skeleton.tsx`, `panel.tsx`, `index.ts` | Tournament-specific UI primitives — useful reference when rebuilding |
| `components/shell/nav-links.ts` | Old nav config (Tournaments / Bracket / Umpire) |
| `components/shell/theme-toggle.tsx` | New design is dark-only; no toggle |
| `lib/api.ts`, `lib/types.ts`, `lib/utils.ts` | Replaced by new `lib/api.ts` + `lib/auth.ts` + `lib/schemas.ts` |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Next.js boilerplate; archived for completeness |

### Backend (`apps/api/`)

| Path | Reason |
|---|---|
| `Services/TournamentStore.cs` | In-memory store — reference for entity relationships when EF Core schema is extended |
| `Domain/ApiContracts.cs` | DTO shapes for tournaments — reference for the rebuild |
| `Domain/InternalModels.cs` | Internal entity definitions for tournaments / matches |
| `Domain/SeedData.cs` | Seeded tournament fixtures — reference for realistic test data |
| `Program.cs` | Current minimal-API endpoint definitions — reference for the routes we'll rebuild on controllers |
| `Epl.Api.csproj`, `appsettings.json`, `appsettings.Development.json` | Original csproj + settings — archived before the multi-project replacement lands |

## Files that stay but get rewritten (NOT archived — git history holds the previous version)

| Path | Action |
|---|---|
| `apps/web/src/app/layout.tsx` | Swap fonts (Inter + Anton + Oswald + JetBrains Mono), wire favicons at `/favicon.ico`, `/favicon-32.png`, `/apple-touch-icon.png`. |
| `apps/web/src/app/page.tsx` | Replace body with the new home composition from [03-frontend.md](./03-frontend.md). |
| `apps/web/src/app/globals.css` | Replace token block with [02-design-system.md](./02-design-system.md) tokens; keep the Tailwind v4 `@theme inline` bridge but point at the new variables. |
| `apps/web/src/components/shell/app-shell.tsx` | Strip nav-links/theme-toggle; render `<SiteHeader/>` + `{children}` + `<SiteFooter/>`. |
| `apps/api/Dockerfile` | Updated for the multi-project COPY; final image still runs `Epl.Api.dll`. |
| `docker-compose.yml` | Add `mssql` service (SQL Server 2022 dev container — matches Azure SQL T-SQL); update `api.build` context. |
| `scripts/run-api-dev.mjs` | Point at `apps/api/src/Epl.Api/Epl.Api.csproj`. |
| `README.md` | Rewrite "Product Scope Implemented" section. |

Rationale for *not* archiving these: each one continues to exist (with the same path) after the rebuild — its prior content is preserved in `git log`, which is the right tool for "show me the old version of this exact file".

## Files that stay as-is

| Path | Action |
|---|---|
| `design-system/MASTER.md` | Renamed in place to `MASTER.archived-light.md` (kept in repo as historical doc). A new `MASTER.md` is generated from the dark EPL tokens via `ui-ux-pro-max --persist`. |
| `design-system/e-city-premier-league/`, `design-system/pages/` | Audited but kept — they're documentation, not source. |

## New assets land directly under `apps/web/public/`

Per [02-design-system.md](./02-design-system.md) and [03-frontend.md](./03-frontend.md), the EPL images copy from `C:\src\Projects\epl-coming-soon\` to **`apps/web/public/`** (no `epl/` subfolder). They are referenced from JSX as `/logo.png`, `/hero-banner.jpg`, `/card-cricket.jpg`, etc.

## Verification after archive + cleanup

```powershell
# 1. The archive exists and contains what we expect
Get-ChildItem -Recurse "C:\src\_archive\badminton-team-event-app\$(Get-Date -Format 'yyyy-MM-dd')" | Measure-Object | Select-Object Count

# 2. Repo build still works (will fail compile until iteration 1 replaces the deleted refs — expected)
npm run lint --workspace @epl/web
dotnet build apps/api/Epl.Api.sln 2>&1 | Select-String -Pattern "error|Build succeeded"

# 3. No stray references to removed symbols inside the active repo
rg -n "TournamentStore|fixtures|hub-hero|bracket-page" apps/web apps/api
# should return zero hits

# 4. The archive is OUTSIDE the repo (so git doesn't see it)
git status
# should show only the expected modified/deleted/new files — nothing from C:\src\_archive
```
