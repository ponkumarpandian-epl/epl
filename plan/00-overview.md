# EPL Season 2 — Rebuild Plan (Overview)

> Iterative rebuild of `badminton-team-event-app` into the **Electronic-City Premier League (EPL) Season 2 (2026)** platform.
> Reference design: [C:\src\Projects\epl-coming-soon\index.html](file:///C:/src/Projects/epl-coming-soon/index.html)
> Frontend: Next.js 16 (existing `apps/web`). Backend: .NET 10 Web API (existing `apps/api`, to be restructured).

---

## Scope (Final — only these features remain)

1. **Home page** — visual clone of `epl-coming-soon/index.html` (navy / crimson / gold dark theme, hero, sport cards, champion banner, sponsors CTA, footer). All colors via CSS token variables — **no inline hex values** in components.
2. **Register link** (in the home page header / hero) → opens the **Team Registration** form (multi-sport: cricket / badminton / volleyball).
3. **User Registration** — sign-up with **mobile number OR email** + password. Newly registered users automatically get the **Player** role.
4. **Login page** — mobile number OR email + password.
5. **Team Registration form** (gated by login, available to any authenticated user) — fields:
   - Apartment Name
   - Team Name
   - Captain Name
   - Captain Mobile Number
   - Apartment Location — picked on a Google Map **without** a Google Cloud project / API key (use the no-key embed — see [03-frontend.md](./03-frontend.md))
   - (system) Sport selection (cricket / badminton / volleyball) — derived from which sport card the user clicked
6. **Team Registration list page** — **Admin role only** — paginated list of all registered teams with search and per-sport filter.
7. **Identity / Auth** — .NET 10 `MapIdentityApi` + EF Core, three seeded roles: **Admin**, **Player**, **Umpire**. Policy-based authorization. New sign-ups default to **Player**.
8. **Everything else removed from the active repo** — current tournaments / bracket / umpire / live-scoring pages and their seeded data are **moved to a backup folder OUTSIDE this repo** (`C:\src\_archive\badminton-team-event-app\<yyyy-MM-dd>\`) so they can be referenced when those features are rebuilt later. They are **not** committed back into this repo. See [06-cleanup.md](./06-cleanup.md) for the exact archive procedure.

---

## Plan files (read in order)

| File | Purpose |
|---|---|
| [01-architecture.md](./01-architecture.md) | High-level architecture, runtime topology, repo layout after the cleanup |
| [02-design-system.md](./02-design-system.md) | EPL palette tokens, typography, components, dark-theme spec — drives all UI work |
| [03-frontend.md](./03-frontend.md) | Next.js app routes, components, asset migration, auth wiring, Google Maps no-key approach |
| [04-backend.md](./04-backend.md) | .NET 10 solution layout, Identity API, EF Core, UoW + Repository, controllers, logging, security |
| [05-iterations.md](./05-iterations.md) | Iteration-by-iteration delivery plan with acceptance criteria for each chunk |
| [06-cleanup.md](./06-cleanup.md) | Exact archive-then-remove procedure (files move to an external backup folder, not deleted) |
| [07-gallery-azure.md](./07-gallery-azure.md) | Feature plan — host gallery images on Azure Blob Storage (`gallery.e-citypremierleague.in`, container per season, auto-discovery, no hardcoded URLs) |
| [08-general-tournaments.md](./08-general-tournaments.md) | Feature plan — stand-alone badminton tournaments (Singles / MD / WD / XD) outside the EPL season, with a reusable Bracket subsystem shared between tournaments and future season fixtures. Mockup: [08-general-tournaments-mockup.html](./08-general-tournaments-mockup.html) |
| [09-database-diagram.html](./09-database-diagram.html) | Visual ER diagram (existing EPL tables + new Tournament & Bracket tables + new TeamMember/Captain FK) — open in a browser. Pure HTML/SVG diagram + collapsible table cross-reference cards below. |
| [10-team-captain-roster.md](./10-team-captain-roster.md) | Feature plan — first-class Captain role per EPL Season team. Captains build the roster via player search; players must be registered users; a `TeamMember` table replaces the free-text CaptainName/Mobile pair. Authorization policy: `TeamCaptainOrAdmin`. Cross-cuts EPL today and any future team-based tournament. |

---

## Top-level decisions (already made — flag if wrong before I start coding)

| # | Decision | Rationale |
|---|---|---|
| D1 | Keep the existing Next.js 16 workspace at `apps/web`; do **not** rewrite from scratch | Already on Next 16 + Tailwind 4 + Fira fonts; only pages/components change |
| D2 | Replace existing `apps/api` (minimal-API in-memory) with a **multi-project .NET 10 solution** (Api / Domain / Application / Infrastructure) using EF Core + Identity | The user asked for controller-based APIs, UoW + Repository, Identity API endpoints, enterprise-grade auth — minimal API + in-memory store is incompatible with that |
| D3 | Database: **Azure SQL Database** in production, with EF Core `Microsoft.EntityFrameworkCore.SqlServer` provider. Local dev runs **SQL Server 2022 Developer Edition** in `docker-compose.yml` (`mcr.microsoft.com/mssql/server:2022-latest` — same T-SQL surface as Azure SQL, free for dev, no Azure subscription required). | User asked for Azure SQL. SQL Server 2022 dev container is Microsoft's current recommended local stand-in (Azure SQL Edge was retired Sept 2025). Same provider, same dialect, prod cut-over is a single connection-string change. |
| D4 | Auth flow: cookie-based identity (`AddIdentityApiEndpoints` default) — **not** JWT in MVP | Built-in, browser-friendly, removes token-refresh complexity. Can be swapped to JWT later behind the same `[Authorize]` policies |
| D5 | Google Map location picker: use **OpenStreetMap + Leaflet** with a **"Open in Google Maps" link**, OR an **iframe `maps.google.com/?output=embed&q=…`** as a fallback view. **Reason:** Google's official Maps JavaScript API requires an API key + billing project — the user explicitly does not want that. We capture lat/lng + address via Leaflet + the free Nominatim reverse-geocode endpoint, and store both fields on the Team record |
| D6 | Replace the design-system MASTER red/gold light palette with the **EPL navy/crimson/gold dark palette** from the reference index.html; archive the old MASTER.md | The user's reference page is authoritative; the current `globals.css` light-mode tokens do not match it |
| D7 | Process logging: **Serilog** with console + rolling-file sinks, request logging middleware, structured properties (UserId, RouteValues, CorrelationId) | "Process logging that helps debug issues" maps cleanly to Serilog's structured + enriched logs |
| D8 | Keep the monorepo `npm run dev` orchestrator but rewrite the API dev script to point at the new solution file | Preserves the existing developer ergonomics |

If any of D1–D8 is wrong, tell me before I start iteration 1.
