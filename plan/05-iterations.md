# 05 — Iterations

Eight self-contained iterations. Each one ships something the user can poke at locally; nothing later in the list blocks anything earlier from being merged. Review gates between iterations are recommended.

---

## Iteration 0 — Archive, cleanup & scaffolding (½ day)

**Goal:** archive out-of-scope code OUTSIDE the repo, strip it from the working tree, prepare empty shells for the new pages, copy the EPL assets.

- Apply [06-cleanup.md](./06-cleanup.md) — **archive first, then remove** from the working tree:
  - Backup target: `C:\src\_archive\badminton-team-event-app\<yyyy-MM-dd>\` (outside this repo).
  - Move `tournaments/`, `bracket/`, `umpire/` routes; tournament/hub components; seeded `data/`; the legacy minimal-API `TournamentStore.cs` + `Domain/*.cs` + the current `Program.cs` body.
- Copy assets from `C:\src\Projects\epl-coming-soon\` → `apps/web/public/` (**no subfolder** — files sit directly at the public root).
- Replace `globals.css` with the EPL token block from [02-design-system.md](./02-design-system.md) (still no real pages yet — just tokens + body background).
- Archive `design-system/MASTER.md` → `MASTER.archived-light.md`, regenerate a new MASTER from the dark tokens.
- Update root `package.json` scripts only if paths actually change.

**Acceptance:**
- `npm run dev` boots; visiting `/` shows just an empty dark navy page; the API returns 200 on `/health`.
- The archive folder `C:\src\_archive\badminton-team-event-app\<yyyy-MM-dd>\` exists and contains the removed files exactly as they were (independently verifiable with `dir /s`).

---

## Iteration 1 — Home page visual clone (1 day)

**Goal:** the home page is a pixel-close port of `epl-coming-soon/index.html`.

- Implement `components/shell/site-header.tsx`, `components/home/topbar.tsx`, `hero-banner.tsx`, `sport-card.tsx` (×3 with per-sport accent token), `champion-banner.tsx`, `sponsors-cta.tsx`, `site-footer.tsx`, `floating-balls.tsx`.
- Wire `app/page.tsx` to render them in the reference order.
- All colors via `var(--…)` tokens — no inline hex. Lint rule: forbid `style={{ color: ... }}` and `bg-[#` in this iteration's diff.
- Header Register button → `/teams/register` (no auth yet).
- Sport cards → `/teams/register?sport=cricket|badminton|volleyball`.
- "Become a Sponsor" → mailto link unchanged from reference.

**Acceptance:**
- Visual diff against reference at 1440/1024/768/375 within ~5% (eyeballed in [verify](#)).
- Lighthouse a11y ≥ 95, performance ≥ 90 desktop.
- Tab navigation works; `prefers-reduced-motion` flattens animations.

---

## Iteration 2 — .NET solution skeleton + Azure SQL (1 day)

**Goal:** the 4-project solution exists, SQL Server 2022 runs in docker for dev (matching Azure SQL in prod), migrations apply on startup.

- Create solution + 4 projects per [04-backend.md](./04-backend.md), wire references.
- Add packages, `AppDbContext : IdentityDbContext<AppUser, AppRole, Guid>`, entities, configs (provider: `Microsoft.EntityFrameworkCore.SqlServer` with `EnableRetryOnFailure` for Azure SQL transient errors).
- `docker-compose.yml` adds the `mssql` service (`mcr.microsoft.com/mssql/server:2022-latest`) with a healthcheck.
- Initial EF migration creates AspNet* + (empty) `Teams`, `Apartments` tables.
- Serilog console + rolling file sink + request logging.
- `IdentitySeeder` creates the three roles + a bootstrap admin from config.
- Swagger comes up at `/swagger`.

**Acceptance:** `docker compose up mssql` (waits for healthy) then `npm run dev:api` migrates the DB, seeds roles, prints structured request logs. `GET /health` returns 200; Swagger shows `/identity/*` endpoints. Connection string is read from `ConnectionStrings__Sql` and the same shape works against an Azure SQL Database server name with one env-var change.

---

## Iteration 3 — User signup + login (1 day)

**Goal:** user can create an account (mobile OR email) and sign in. Cookie auth works across both apps.

- Backend: `AuthController` with `POST /api/auth/register` (assigns `Player` role + signs in). Use built-in `MapIdentityApi` for `/identity/login` and `/identity/logout`. Rate-limit both endpoints.
- Frontend:
  - `/register` + `/login` pages using the `field`, `password-field`, `mobile-or-email-field`, `submit-button` components.
  - Server Actions call the .NET API with `credentials: 'include'`; cookie is set on `localhost:3000` because Next proxies `/api/*` to the API.
  - On success → `redirect('/')`.
  - `getCurrentUser()` helper reads `/api/auth/me`; header shows the user's name + logout when signed in.
- E2E: signup-with-mobile → land on home → logout → login-with-mobile works.

**Acceptance:**
- Signup with `9591337122` then login with the same → cookie set, header shows "Hi Ponkumar" + Logout.
- Signup with email works the same way.
- Bad password (<8 chars / no digit) shows inline field error.
- 5 wrong passwords → 15-min lockout (returned as 423 by Identity).
- `/teams/register` accessible only when signed in; otherwise redirects to `/login?next=…`.

---

## Iteration 4 — Team registration form + map picker (1.5 days)

**Goal:** authenticated users can register a team for a sport, picking the apartment location on a map.

- Backend: `TeamsController.Create` (`POST /api/teams`) protected by `PlayerOrAdmin` policy. `TeamService.CreateAsync` with `IUnitOfWork` (Apartment dedup by lat/lng rounded to 6 decimals). FluentValidation on `CreateTeamRequest`.
- Frontend:
  - `/teams/register` page reads `?sport=` from URL.
  - `map-picker.tsx` integrates Leaflet + OpenStreetMap tiles. Click-to-place + "Use my current location" button.
  - Reverse-geocode proxied via `app/api/geocode/reverse/route.ts` (server-side `fetch` to Nominatim with proper `User-Agent`, ~1s debounce).
  - On success → toast + redirect to `/` (admin will see it in the next iteration).
- Logging: every `Team {Id}` create logged with `UserId`, `Sport`, `ApartmentId`, `Elapsed`.

**Acceptance:**
- Form rejects without map pin set ("apartmentLat/Lng required").
- Same apartment registered twice → one `Apartment` row, two `Team` rows.
- Refresh shows the form locked to the same sport when arriving via a sport-card link.
- DB row inspected via `sqlcmd` (or Azure Data Studio) matches the captured fields exactly.

---

## Iteration 5 — Admin team list (½ day)

**Goal:** admins can view all registered teams with search and per-sport filter.

- Backend: `TeamsController.List` (`GET /api/teams`) protected by `AdminOnly`. Pagination + `search` (matches teamName, apartmentName, captainName) + `sport=` filter. Returns `{ items, total, page, pageSize }`.
- Frontend: `/teams/admin` (Server Component) calls `api.teams.list` server-side. `admin-filter-bar.tsx` and `team-row.tsx`. Filters update via URL searchParams + `revalidatePath`.
- Pixel-light table styled with the existing tokens (no extra components).

**Acceptance:**
- Non-admin (player) visiting `/teams/admin` → redirected to `/`.
- Admin sees a table with all teams; filtering by sport works; search by captain/team/apartment narrows results; pagination works (default 20/page).

---

## Iteration 6 — Hardening (½ day)

**Goal:** the security checklist from [04-backend.md](./04-backend.md) is satisfied; cleanup of any "TODO security" left in earlier iterations.

- HSTS + HTTPS redirection in non-Development.
- Cookies `Secure=true` in non-Development.
- Antiforgery on all browser-reachable POSTs.
- `IExceptionMiddleware` returns ProblemDetails; no stack traces leak in non-Development.
- CORS narrowed to the deployed domain (env-driven).
- Confirm Serilog redacts request bodies on `/api/auth/*` and `/identity/*`.

**Acceptance:**
- `dotnet test` passes; manual security spot-checks (CSRF via curl rejected, no email/mobile in logs).
- ZAP baseline scan returns no High findings.

---

## Iteration 7 — Tests + CI (½ day)

- xUnit tests for `TeamService` (Apartment dedup, role enforcement, validation failures).
- WebApplicationFactory + `Testcontainers.MsSql` for `TeamsController` happy + 401/403 paths.
- Playwright smoke for: home renders, signup→login, register-team (mocked map), admin-list filters.
- GitHub Actions: `dotnet build`, `dotnet test`, `npm test`, `npm run build`.

---

## Iteration 8 — Stretch / nice-to-have (only after review)

- Mobile-OTP login (Twilio Verify or MSG91) — drop password for mobile sign-ups.
- Email confirmation flow (`SignIn.RequireConfirmedAccount = true`) + magic-link login.
- Sponsors gallery on home (re-introduce the tile grid once we have logos).
- Admin: edit/delete team rows.
- Public read-only "Registered Teams" page after registration closes.

---

## Acceptance gate: do these before calling iteration N "done"

1. `npm run dev` boots both apps without errors.
2. `dotnet test` is green.
3. Lighthouse a11y ≥ 95 on every public page touched.
4. No inline color literals in any TSX/CSS in the diff (lint rule + grep).
5. Logs show structured `UserId` + `CorrelationId` for every request involved in the iteration.
6. Manual smoke per the iteration's "Acceptance" bullets, captured as a 30-second screen recording for review.
