# 01 — Architecture

## Runtime topology

```
┌──────────────────────────┐        ┌─────────────────────────────┐        ┌──────────────────────┐
│  Next.js 16 (apps/web)   │ HTTPS  │  ASP.NET Core 10 (apps/api) │  EF    │  Azure SQL Database  │
│  React 19 · Tailwind 4   ├───────▶│  Controllers + Identity API ├───────▶│  (prod)              │
│  Cookie auth (same-site) │        │  Serilog · UoW + Repository │        │  SQL Server 2022     │
└──────────────────────────┘        └─────────────────────────────┘        │  (docker, dev)       │
         :3000                              :8080 (HTTP dev) / :8081 (HTTPS) │  epldb               │
                                                                            └──────────────────────┘
```

- The Next.js app proxies `/api/*` to the .NET API via `next.config.ts` rewrites; the browser sees a single origin so the Identity cookie sticks without CORS gymnastics.
- Identity cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in prod.
- A single Azure SQL database (SQL Server 2022 container in dev) hosts the Identity tables (`AspNetUsers`, `AspNetRoles`, …) and the domain tables (`Teams`, `Apartments`, `Sports`, `TeamPlayers`). Same T-SQL dialect and the same EF Core provider in both environments — only the connection string changes.

## Repo layout (after the rebuild)

```
badminton-team-event-app/
├─ apps/
│  ├─ web/                       Next.js 16 (kept, pages rewritten)
│  │  ├─ public/                 ← logo.png, hero-banner.jpg, card-*.jpg, favicons (copied from epl-coming-soon; no subfolder)
│  │  └─ src/
│  │     ├─ app/
│  │     │  ├─ page.tsx          home (clone of epl-coming-soon)
│  │     │  ├─ login/page.tsx
│  │     │  ├─ register/page.tsx user signup
│  │     │  ├─ teams/
│  │     │  │  ├─ register/page.tsx          (auth required)
│  │     │  │  └─ admin/page.tsx             (Admin policy)
│  │     │  ├─ api/auth/[...]/route.ts        thin pass-through to /identity/* on the API
│  │     │  └─ layout.tsx
│  │     ├─ components/
│  │     │  ├─ home/             hero, header, sport-card, champion-banner, sponsors-cta, footer
│  │     │  ├─ forms/            input, button, password, mobile, map-picker
│  │     │  └─ shell/            site-header, site-footer
│  │     ├─ lib/
│  │     │  ├─ api.ts            fetch wrappers (server + client variants)
│  │     │  ├─ auth.ts           getCurrentUser(), requireRole()
│  │     │  └─ schemas.ts        zod schemas for forms (single source of truth)
│  │     └─ styles/
│  │        └─ globals.css       new EPL dark tokens (see 02-design-system.md)
│  │
│  └─ api/                       .NET 10 solution (replaces current minimal-API project)
│     ├─ Epl.Api.sln
│     ├─ src/
│     │  ├─ Epl.Api/             ASP.NET Core host — controllers, Program.cs, DI wiring
│     │  ├─ Epl.Application/     CQRS-ish services, DTOs, validators (FluentValidation), policy names
│     │  ├─ Epl.Domain/          Entities (User, Team, Apartment, Sport, Roles enum), domain interfaces
│     │  └─ Epl.Infrastructure/  EF Core DbContext, Migrations, Repositories, UnitOfWork, Identity config
│     └─ tests/
│        ├─ Epl.Api.Tests/       integration tests with WebApplicationFactory + Testcontainers.MsSql
│        └─ Epl.Application.Tests/ unit tests for services
│
├─ docker-compose.yml            web + api + mssql (SQL Server 2022 Developer for local dev)
├─ scripts/                      run-web-dev.mjs, run-api-dev.mjs (kept, paths updated)
└─ plan/                         ← this folder
```

## Why 4 .NET projects (not 1)

| Project | Depends on | What lives here |
|---|---|---|
| `Epl.Api` | Application, Infrastructure | Controllers, filters, middleware, Program.cs, Serilog setup, Swagger |
| `Epl.Application` | Domain | DTOs, service interfaces + implementations, validators, AuthorizationPolicies constants |
| `Epl.Infrastructure` | Application, Domain | `AppDbContext`, EF migrations, repository impls, `UnitOfWork`, Identity stores |
| `Epl.Domain` | — | Entities, value objects, domain enums, repository interfaces |

The Api project never references EF or `DbContext` directly — it only sees `IUnitOfWork`, `ITeamRepository`, and the Application service interfaces. This is the enforcement edge that keeps "enterprise grade" real instead of cosmetic.

## Request flow for a protected endpoint (e.g. `POST /api/teams`)

1. Browser sends cookie with the request → `apps/web` (Next.js) proxies `/api/teams` to `apps/api`.
2. ASP.NET `UseAuthentication()` decrypts the Identity cookie → resolves `ClaimsPrincipal`.
3. `[Authorize(Policy = "PlayerOrAdmin")]` on the controller action validates the role claim.
4. Controller → `ITeamService.CreateAsync(dto, userId)` (Application layer).
5. Service → `IUnitOfWork` → `ITeamRepository.Add(team)` + `IApartmentRepository.GetOrCreate(name, lat, lng)` → `await uow.SaveChangesAsync()`.
6. Serilog request-logging middleware writes `RequestPath`, `UserId`, `ElapsedMs`, `StatusCode` as structured properties.
7. Response → Next.js → React component → `revalidatePath('/teams/admin')` if the call came from a Server Action.

## What gets removed from the existing repo (archived, not deleted)

See [06-cleanup.md](./06-cleanup.md) for the exact archive-then-remove procedure. High-level: every page that isn't home / login / register / teams, plus the seeded in-memory `TournamentStore`, gets **copied to `C:\src\_archive\badminton-team-event-app\<yyyy-MM-dd>\`** (a folder OUTSIDE this repo) before being removed from the working tree. The archive is the reference material for when tournaments / bracket / umpire / live-scoring features are rebuilt later.
