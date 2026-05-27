# CLAUDE.md

Project context and working agreements for AI assistants editing this repo.

---

## What this is

**Electronic-City Premier League (EPL)** — a tournament site for an inter-apartment Cricket / Badminton / Volleyball league in Electronic City, Bengaluru. Public marketing pages, team registration, profile / skill management, and an admin area for seasons and registrations.

The codebase is a small **monorepo**:

```
apps/
  web/   Next.js 16 (App Router) frontend
  api/   .NET 10 backend (slnx: apps/api/Epl.Api.slnx)
        ├ Epl.Api            ASP.NET Core host + controllers + Program.cs
        ├ Epl.Application    DTOs, services, validators, Result<T>
        ├ Epl.Domain         Entities, abstractions
        └ Epl.Infrastructure EF Core, persistence, seeders, storage
plan/    Architecture and rollout notes (planning docs, not code-of-record)
.github/workflows/  CI + deploys
```

Deploys to **two Azure App Services** in `southindia-01`:
- Backend: `epl-sports-api` (Windows, .NET 10)
- Frontend: `epl-sports-ui` (Linux, Next.js standalone)

---

## Stack at a glance

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router, standalone output), React 19, TypeScript 5, Tailwind 4, Zod, Leaflet |
| Backend | ASP.NET Core (.NET 10), EF Core 10, Microsoft Identity, FluentValidation + SharpGrip auto-validation, Serilog |
| OpenAPI | `Microsoft.AspNetCore.OpenApi` (built-in) + Scalar UI at `/scalar/v1`. **Do not reintroduce Swashbuckle** — it doesn't fully support .NET 10's OpenAPI runtime |
| DB | Azure SQL (`epldb` on server `eplsqlserver`). Migrations applied at app startup via `db.Database.MigrateAsync()` in [Program.cs](apps/api/src/Epl.Api/Program.cs) |
| Auth | Cookie-based (`epl.auth`), ASP.NET Identity, custom redirects return 401/403 instead of redirecting |
| Storage | Profile avatars: `LocalProfileImageStore` writes to `wwwroot/avatars` (⚠ doesn't survive deploys — needs Azure Blob swap for prod). Gallery images: Azure Blob `steplmediacontent/season1`, listed via config in `appsettings.json` |
| Logging | Serilog → console + rolling file under `logs/epl-*.log` |
| Deploy | GitHub Actions, triggered on push to `main` for matching paths under `apps/api/**` or `apps/web/**` |

---

## Commands

Run from the repo root.

| Goal | Command |
|---|---|
| Run both apps in dev (concurrently) | `npm run dev` |
| Web only (Next.js dev server) | `npm run dev:web` |
| API only (`dotnet run`) | `npm run dev:api` |
| **Verify everything before pushing** | `npm run verify` |
| Just web type-check | `npx tsc --noEmit -p apps/web/tsconfig.json` |
| Just web lint | `npm run lint --workspace @epl/web` |
| Just API build | `dotnet build apps/api/Epl.Api.slnx -c Release -nologo` |
| Production build (web + api) | `npm run build` |
| Local AI code review (Claude Code) | `npm run review` |

`npm run verify` runs three checks: a secret scan, web type-check, and API release build. It mirrors the `.github/workflows/verify.yml` CI workflow — if local verify passes, CI passes.

**No automated tests yet.** When you add a critical-path feature, surface that to the user rather than silently shipping it untested.

### Local code review

A Claude-Code-driven review runs locally against pending changes:

```
npm run review                       # review uncommitted + staged + ahead-of-main
npm run review -- "auth flow"        # narrow with a hint
```

One-time setup:

```
npm install -g @anthropic-ai/claude-code   # install CLI (https://github.com/anthropics/claude-code)
claude login                                # auth (or export ANTHROPIC_API_KEY)
```

The script in [scripts/claude-review.mjs](scripts/claude-review.mjs) invokes the **code-reviewer subagent** at [.claude/agents/code-reviewer.md](.claude/agents/code-reviewer.md), which reports findings in the project's standard severity rubric (🔴 must / 🟡 should / 🔵 nit). Fixes are not applied automatically — delegate to the **fix-findings** agent or address them by hand.

Run this before opening a PR. It complements (not replaces) `npm run verify`.

---

## Code conventions

### Backend

- **Result<T> pattern.** Service methods return `Result<T>` (success-or-error union) rather than throwing for domain errors. See `Epl.Application/Common/Result.cs`. Controllers convert `Result.Error` → `BadRequest`.
- **DTOs live with their feature.** Each `Epl.Application/<Area>/Dtos/` folder is the public contract for that area. Don't leak EF entities through controllers.
- **Validators auto-run.** FluentValidation validators live next to DTOs (e.g. `Epl.Application/Auth/Validators/`). Field errors are returned automatically as 400 with the field-error map — controllers don't call `Validate` manually.
- **Authorization policies, not roles.** Use `AuthorizationPolicies.AdminOnly`, `PlayerOrAdmin`, `UmpireOrAdmin` defined in [Program.cs](apps/api/src/Epl.Api/Program.cs). Don't sprinkle `[Authorize(Roles = "Admin")]` directly.
- **Migrations are auto-applied on startup.** Don't add a separate migration step. The `DataSeeder` is idempotent — adding a new seeded row is safe; modifying existing data is not (won't overwrite prod).
- **App settings use double-underscore for nesting.** `ConnectionStrings__Sql`, `Gallery__Images__0__Url`, `Bootstrap__AdminEmail`. The seeder skips with a warning if `Bootstrap__AdminEmail/Password` are unset.
- **Exception handling is centralised.** `ExceptionMiddleware` maps unhandled exceptions to `application/problem+json`. Don't add try/catch just to return 500s.
- **Correlation IDs.** Every request gets one via `CorrelationIdMiddleware` and it's threaded through logs + responses (`x-correlation-id` header).

### Frontend

- **Server-only API layer.** `apps/web/src/lib/api.ts` imports `"server-only"`. All API calls happen server-side (rewrites in `next.config.ts` proxy `/api/*` and `/identity/*` to the backend via `API_INTERNAL_URL`). Don't fetch the backend directly from the browser.
- **Cookie + correlation-ID forwarding** is handled inside `api.ts`. New API helpers should call `call()` rather than `fetch()` directly.
- **Phone numbers in E.164.** Stored as `+91…`. WhatsApp URLs use `https://wa.me/<msisdn-without-plus>`.
- **Avatars + gallery images** are served via Next.js Image; new hostnames need to be added to `remotePatterns` in [next.config.ts](apps/web/next.config.ts).
- **No client-side env vars for secrets.** `API_INTERNAL_URL` is server-only — it's read in `next.config.ts` rewrites and `lib/api.ts`. Anything in `NEXT_PUBLIC_*` is shipped to the browser and must not contain secrets.

### Both

- **Don't add comments that restate the code.** Only add a comment when the *why* is non-obvious (hidden invariant, workaround, surprising behavior).
- **Prefer editing existing files** to creating new ones. No new abstractions unless the third use case has appeared.
- **Markdown links for file references** in PRs and chat: `[filename.ts:42](relative/path.ts#L42)`.

---

## Review guidelines

When reviewing changes on this repo (the `code-reviewer` subagent and humans both):

**Focus on:**
- **Security issues** — SQL injection (raw queries, dynamic LINQ), auth bypass (missing `[Authorize]` on new endpoints, missing policy checks), secrets committed to code or `appsettings.json` (the real values must come from App Service settings or user-secrets), unsafe deserialization, missing `rel="noopener noreferrer"` on `target="_blank"` links to user-controlled hosts.
- **Bugs and logic errors** — Result<T> ignored (caller doesn't check `IsSuccess`), unawaited Tasks, null deref through nullable refs, EF tracking surprises (multiple `SaveChangesAsync` in one scope, detached entities, `AsNoTracking` missed on read paths).
- **Performance problems** — N+1 EF queries (Include missing, loops over collections that each hit the DB), missing `AsNoTracking()` on hot read paths, unnecessary `ToListAsync()` before filtering, missing indexes for new query patterns, server components fetching the same data multiple times instead of passing props.
- **Breaking API changes** — Renaming/removing DTO fields the frontend reads, route changes without redirects, response shape changes, cookie name changes, removal of public endpoints. The frontend is in the same repo — if a backend change breaks `apps/web`, fix both in one PR.

**Don't flag:**
- Style issues handled by ESLint / `dotnet format` / Prettier.
- Test coverage suggestions **unless a critical path is untested** (registration submission, login, admin actions, payment if/when added).
- Minor naming preferences.
- Backward-compat shims for code the frontend doesn't use.

**Project specifics to keep in mind:**
- The frontend cookie-auths against the backend via the Next.js rewrites — CORS isn't in play for normal traffic. Don't suggest CORS changes for paths that flow through `/api/*`.
- Migrations run on app startup. A bad migration takes the whole API down on next deploy — extra scrutiny for `Migration.Up()` that does destructive work.
- The backend ships `ASPNETCORE_ENVIRONMENT=Development` on prod today (technical debt). Don't rely on `app.Environment.IsDevelopment()` for security-sensitive branching.
- The avatar storage is local-disk and ephemeral. Don't ship a feature that assumes avatars persist across deploys.
- Swashbuckle is gone — `Microsoft.AspNetCore.OpenApi` + Scalar is the OpenAPI stack. Don't reintroduce `[SwaggerOperation]` / Swashbuckle filters.

---

## Things to avoid

- Reintroducing `Swashbuckle.AspNetCore` (incompatible with .NET 10 OpenAPI runtime → 500 on `/swagger/v1/swagger.json`).
- Direct browser-to-backend fetches from React components (use the server-only `lib/api.ts`).
- Throwing for expected domain errors (use `Result<T>`).
- Adding `dotnet ef database update` to deploy steps (migrations apply at startup).
- Hardcoding the backend URL (`https://epl-sports-api-btdke0b5cadzbta6.southindia-01.azurewebsites.net`) — read it from `API_INTERNAL_URL`.
- Naming an Azure resource without checking global uniqueness first (we already burned through `eplmedia` → `steplmediacontent`).

---

## When in doubt

- The user is a working developer — be direct, terse, and concrete. File:line references over prose.
- For exploratory questions ("what could we do about X?"), respond in 2–3 sentences with a recommendation and the main tradeoff. Don't implement until they agree.
- Read `plan/` docs for design intent; treat code as the authoritative spec when they disagree.
