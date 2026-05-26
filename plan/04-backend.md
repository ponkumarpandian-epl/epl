# 04 — Backend (.NET 10, `apps/api`)

> Replace the current minimal-API in-memory project with a 4-project solution: `Epl.Api`, `Epl.Application`, `Epl.Domain`, `Epl.Infrastructure`. Identity via `MapIdentityApi`, persistence via EF Core targeting **Azure SQL** (`Microsoft.EntityFrameworkCore.SqlServer`), Unit-of-Work + Repository, controllers, Serilog structured logging, policy-based authorization.
>
> **Environment matrix**
>
> | Env | Database | Notes |
> |---|---|---|
> | Dev (local) | **SQL Server 2022 Developer Edition** in docker-compose (`mcr.microsoft.com/mssql/server:2022-latest`) | Linux container, same T-SQL surface as Azure SQL, free for dev use. (Azure SQL Edge — the older recommendation — was retired by Microsoft in Sept 2025.) |
> | CI | **Testcontainers.MsSql** (SQL Server image) | Same T-SQL dialect; spins up per test class |
> | Prod / staging | **Azure SQL Database** (Standard S1+ recommended) | Connection string lives in Key Vault / `ConnectionStrings__Sql` env var |

## Solution layout

```
apps/api/
├─ Epl.Api.sln
├─ src/
│  ├─ Epl.Domain/
│  │  ├─ Entities/
│  │  │  ├─ AppUser.cs          : IdentityUser<Guid>
│  │  │  ├─ AppRole.cs          : IdentityRole<Guid>
│  │  │  ├─ Team.cs
│  │  │  ├─ Apartment.cs
│  │  │  └─ Sport.cs            (enum: Cricket=1, Badminton=2, Volleyball=3)
│  │  ├─ Abstractions/
│  │  │  ├─ IRepository.cs      generic CRUD
│  │  │  ├─ ITeamRepository.cs
│  │  │  ├─ IApartmentRepository.cs
│  │  │  └─ IUnitOfWork.cs
│  │  └─ Common/
│  │     └─ Result.cs           OK/Error discriminated result
│  │
│  ├─ Epl.Application/
│  │  ├─ Auth/
│  │  │  ├─ Dtos/RegisterRequest.cs · LoginRequest.cs · MeResponse.cs
│  │  │  ├─ Services/IAuthService.cs · AuthService.cs
│  │  │  └─ Validators/RegisterRequestValidator.cs (FluentValidation)
│  │  ├─ Teams/
│  │  │  ├─ Dtos/CreateTeamRequest.cs · TeamResponse.cs · TeamListQuery.cs
│  │  │  ├─ Services/ITeamService.cs · TeamService.cs
│  │  │  └─ Validators/CreateTeamRequestValidator.cs
│  │  ├─ Authorization/
│  │  │  └─ AuthorizationPolicies.cs  // const strings: AdminOnly, PlayerOrAdmin, …
│  │  └─ DependencyInjection.cs       AddApplication() extension
│  │
│  ├─ Epl.Infrastructure/
│  │  ├─ Persistence/
│  │  │  ├─ AppDbContext.cs           : IdentityDbContext<AppUser, AppRole, Guid>
│  │  │  ├─ Configurations/TeamConfig.cs · ApartmentConfig.cs
│  │  │  └─ Migrations/
│  │  ├─ Repositories/
│  │  │  ├─ Repository.cs              generic EF impl
│  │  │  ├─ TeamRepository.cs
│  │  │  └─ ApartmentRepository.cs
│  │  ├─ UnitOfWork/
│  │  │  └─ UnitOfWork.cs              wraps DbContext.SaveChanges + Transaction
│  │  ├─ Seed/
│  │  │  └─ IdentitySeeder.cs          seeds Admin/Player/Umpire roles + first admin
│  │  └─ DependencyInjection.cs        AddInfrastructure(connectionString)
│  │
│  └─ Epl.Api/
│     ├─ Controllers/
│     │  ├─ AuthController.cs          /api/auth/register · /me  (login + logout handled by MapIdentityApi)
│     │  └─ TeamsController.cs         /api/teams (POST), /api/teams (GET admin), /api/teams/{id}
│     ├─ Middleware/
│     │  ├─ CorrelationIdMiddleware.cs adds X-Correlation-Id to log scope
│     │  └─ ExceptionMiddleware.cs     ProblemDetails + Serilog enrichment
│     ├─ Program.cs                    composition root
│     ├─ appsettings.json              connection string placeholder + Serilog config
│     └─ Epl.Api.csproj
└─ tests/
   ├─ Epl.Api.Tests/                   WebApplicationFactory + Testcontainers.MsSql
   └─ Epl.Application.Tests/           xUnit + FluentAssertions
```

## Required NuGet packages (Epl.Api)

| Package | Reason |
|---|---|
| `Microsoft.AspNetCore.Identity.EntityFrameworkCore` | Identity stores |
| `Microsoft.AspNetCore.Authentication.BearerToken` | bring-in for `MapIdentityApi` token mode (we use cookie mode but the package is required) |
| `Microsoft.EntityFrameworkCore` + `Microsoft.EntityFrameworkCore.SqlServer` | EF Core + Azure SQL / SQL Server |
| `Microsoft.EntityFrameworkCore.Design` | dotnet ef tooling |
| `FluentValidation.AspNetCore` | DTO validation |
| `Serilog.AspNetCore`, `Serilog.Sinks.Console`, `Serilog.Sinks.File`, `Serilog.Enrichers.Environment`, `Serilog.Enrichers.CorrelationId` | structured + rolling-file logs |
| `Swashbuckle.AspNetCore` | Swagger (already present) |
| `Mapster` *(optional)* | DTO ↔ entity mapping; can also be done by hand |

## Entities (Domain)

```csharp
public class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Team> CaptainedTeams { get; set; } = new List<Team>();
}

public class AppRole : IdentityRole<Guid> { }

public enum Sport { Cricket = 1, Badminton = 2, Volleyball = 3 }

public class Apartment
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string Address { get; set; } = default!;   // human-readable from Nominatim
    public string MapProvider { get; set; } = "osm";
    public DateTimeOffset CreatedAt { get; set; }
}

public class Team
{
    public Guid Id { get; set; }
    public Sport Sport { get; set; }
    public string Name { get; set; } = default!;
    public Guid ApartmentId { get; set; }
    public Apartment Apartment { get; set; } = default!;
    public string CaptainName { get; set; } = default!;
    public string CaptainMobile { get; set; } = default!;
    public Guid CreatedByUserId { get; set; }
    public AppUser CreatedBy { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

EF configuration highlights:

- `Team` ↔ `Apartment` (many-to-one), `Apartment.Name + Lat + Lng` unique together (avoid duplicates).
- `Team.Name + Sport + ApartmentId` unique together (no two same-name teams per sport in the same apartment).
- `Apartment.Lat`/`Lng` stored as `double precision`; if we later need real spatial queries we add PostGIS — not needed for MVP.

## Identity wiring (`Program.cs`)

```csharp
// 1) Serilog first — captures startup errors
builder.Host.UseSerilog((ctx, sp, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithCorrelationId()
    .Enrich.WithEnvironmentName()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {SourceContext} :: {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.File("logs/epl-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 14));

// 2) Persistence + Identity
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(
        builder.Configuration.GetConnectionString("Sql"),
        sql => sql.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null))); // built-in Azure SQL transient-error resilience

builder.Services
    .AddIdentityCore<AppUser>(o => {
        o.User.RequireUniqueEmail = false;             // we allow mobile-only users
        o.Password.RequiredLength = 8;
        o.Password.RequireNonAlphanumeric = false;
        o.Lockout.MaxFailedAccessAttempts = 5;
        o.SignIn.RequireConfirmedAccount = false;       // OTP/email-verification is a later iteration
    })
    .AddRoles<AppRole>()                                // <-- enables roles by default
    .AddRoleManager<RoleManager<AppRole>>()
    .AddSignInManager<SignInManager<AppUser>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddApiEndpoints();                                 // <-- MapIdentityApi support

// 3) Cookie-based auth (vs bearer) for browser flow
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();

// 4) Authorization policies
builder.Services.AddAuthorization(o => {
    o.AddPolicy(AuthorizationPolicies.AdminOnly,     p => p.RequireRole(Roles.Admin));
    o.AddPolicy(AuthorizationPolicies.PlayerOrAdmin, p => p.RequireRole(Roles.Player, Roles.Admin));
    o.AddPolicy(AuthorizationPolicies.UmpireOrAdmin, p => p.RequireRole(Roles.Umpire, Roles.Admin));
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build(); // safe default
});

// 5) DI
builder.Services.AddApplication();            // FluentValidation + services
builder.Services.AddInfrastructure(builder.Configuration);   // repos + UoW

// 6) Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 7) CORS — only needed in dev when Next runs on a separate port without the rewrite proxy
builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins("http://localhost:3000")
    .AllowCredentials()
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

// 8) Pipeline order
app.UseSerilogRequestLogging(opts => {
    opts.EnrichDiagnosticContext = (diag, http) => {
        diag.Set("UserId", http.User?.FindFirstValue(ClaimTypes.NameIdentifier));
        diag.Set("ClientIp", http.Connection.RemoteIpAddress?.ToString());
    };
});
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();
app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

// 9) Endpoints
app.MapGroup("/identity").MapIdentityApi<AppUser>();    // /identity/login, /logout, /refresh, /register, /confirmEmail, …
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { ok = true, ts = DateTimeOffset.UtcNow }));

// 10) Apply migrations + seed roles
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await IdentitySeeder.SeedAsync(scope.ServiceProvider);
}

app.Run();
```

### Why we still use a custom `AuthController`

`MapIdentityApi` covers `/login`, `/logout`, `/register`, `/refresh`, `/confirmEmail`. But the registration endpoint it ships **doesn't** assign a role. So we expose our own thin wrapper:

```csharp
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")] [AllowAnonymous]
    public Task<IActionResult> Register(RegisterRequest req)
        => auth.RegisterAsync(req);                                          // creates user + assigns Player role

    [HttpGet("me")] [Authorize]
    public Task<IActionResult> Me() => auth.GetMeAsync(User);
}
```

`AuthService.RegisterAsync`:
1. Branches on identifier format (email vs `[6-9]\d{9}` mobile).
2. Calls `UserManager.CreateAsync`.
3. `UserManager.AddToRoleAsync(user, Roles.Player)`.
4. On success calls `SignInManager.SignInAsync` to issue the cookie immediately (so the user lands logged-in).

Login goes through the built-in `/identity/login` — no custom logic needed.

## Teams API surface

| Verb | Route | Policy | Body / Query |
|---|---|---|---|
| POST | `/api/teams` | `PlayerOrAdmin` | `CreateTeamRequest` |
| GET | `/api/teams` | `AdminOnly` | `?sport=&search=&page=&pageSize=` |
| GET | `/api/teams/{id}` | `AdminOnly` | — |

`CreateTeamRequest`:

```csharp
public record CreateTeamRequest(
    Sport Sport,
    string ApartmentName,
    string TeamName,
    string CaptainName,
    string CaptainMobile,
    double ApartmentLat,
    double ApartmentLng,
    string ApartmentAddress);
```

`TeamService.CreateAsync` flow:

```csharp
var apartment = await uow.Apartments.GetByLatLngAsync(dto.ApartmentLat, dto.ApartmentLng)
                ?? uow.Apartments.Add(new Apartment { Name = dto.ApartmentName, Lat = …, Lng = …, Address = … });

var team = uow.Teams.Add(new Team {
    Sport = dto.Sport, Name = dto.TeamName, Apartment = apartment,
    CaptainName = dto.CaptainName, CaptainMobile = dto.CaptainMobile,
    CreatedByUserId = currentUserId
});

await uow.SaveChangesAsync();
log.LogInformation("Team {TeamId} registered for {Sport} by user {UserId}", team.Id, team.Sport, currentUserId);
return Result.Ok(team.ToResponse());
```

## Unit of Work + Repository

`IUnitOfWork`:

```csharp
public interface IUnitOfWork : IAsyncDisposable {
    ITeamRepository Teams { get; }
    IApartmentRepository Apartments { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
```

The implementation holds the same `AppDbContext` instance that's resolved from DI (scoped lifetime) and forwards `SaveChangesAsync`. Each repository receives the **same** `AppDbContext` via constructor injection so all operations participate in a single transaction.

## Logging strategy (Serilog)

- Console sink (dev): readable single-line format with `{CorrelationId}`.
- Rolling-file sink: `apps/api/src/Epl.Api/logs/epl-yyyyMMdd.log`, 14-day retention.
- `UseSerilogRequestLogging` enriches each request log with `UserId`, `ClientIp`, `RequestPath`, `StatusCode`, `Elapsed`.
- `ExceptionMiddleware` catches unhandled exceptions, returns RFC 7807 ProblemDetails, logs at `Error` with the full exception and correlation id.
- `appsettings.json` excerpt:

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

## Security checklist

- [ ] Cookie: `HttpOnly`, `SameSite=Lax`, `Secure=true` in non-Development.
- [ ] HSTS + HTTPS redirection enabled in non-Development (`app.UseHsts(); app.UseHttpsRedirection();`).
- [ ] Antiforgery on every state-changing endpoint that's reachable from the browser. (`AddAntiforgery` + `[ValidateAntiForgeryToken]` on cookie-auth POSTs; the Identity API endpoints have their own anti-CSRF model — confirm in iteration 4.)
- [ ] Rate-limiting on `/identity/login` and `/api/auth/register` via `AddRateLimiter` (fixed window, 10/min/IP).
- [ ] Lockout: 5 failed logins → 15 min lockout (Identity default).
- [ ] Passwords: `PasswordHasher<AppUser>` (PBKDF2-SHA512 in .NET 10).
- [ ] CORS: explicit `WithOrigins`, never `AllowAnyOrigin` once we go live.
- [ ] Secrets: connection string from `dotnet user-secrets` in dev, env-var (`ConnectionStrings__Sql`) in container, **Azure Key Vault reference** in App Service / Container Apps in prod. Prefer **Azure AD / Managed Identity authentication** (`Authentication=Active Directory Default`) over SQL logins once the app is hosted in Azure — no password in config.
- [ ] No PII in logs — log `UserId` (Guid) instead of email/mobile; structured logger redacts request bodies on `/api/auth/*`.
- [ ] EF Core: parameterized queries always (no string interpolation into `FromSqlRaw`).

## Seeded data (first run)

`IdentitySeeder.SeedAsync`:
1. Ensure roles exist: `Admin`, `Player`, `Umpire`.
2. Read `Bootstrap:AdminEmail` / `Bootstrap:AdminPassword` from configuration (env-var in prod).
3. If that admin user doesn't exist, create it + assign `Admin` role.
4. **No other seed data** — the team list starts empty.

## docker-compose

```yaml
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: ${MSSQL_SA_PASSWORD:?set in .env — see SECRETS.md}   # dev only — never reused outside docker-compose
      MSSQL_PID: "Developer"
    ports: ["1433:1433"]
    volumes: [sqldata:/var/opt/mssql]
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"$$MSSQL_SA_PASSWORD\" -No -Q 'SELECT 1' || exit 1"]
      interval: 10s
      retries: 12
      start_period: 30s
  api:
    build: ./apps/api
    environment:
      ConnectionStrings__Sql: "Server=mssql,1433;Database=epldb;User Id=sa;Password=${MSSQL_SA_PASSWORD};Encrypt=False;TrustServerCertificate=True;"
      ASPNETCORE_ENVIRONMENT: Development
    depends_on:
      mssql:
        condition: service_healthy
    ports: ["8080:8080"]
  web:
    build: ./apps/web
    environment:
      API_INTERNAL_URL: http://api:8080
    depends_on: [api]
    ports: ["3000:3000"]
volumes: { sqldata: {} }
```

### Connection string reference

| Environment | Connection string (template) | Notes |
|---|---|---|
| Local docker-compose | `Server=mssql,1433;Database=epldb;User Id=sa;Password=…;Encrypt=False;TrustServerCertificate=True;` | SQL Server 2022 dev container; `Encrypt=False` because the in-container cert is self-signed |
| Local LocalDB (no docker) | `Server=(localdb)\\MSSQLLocalDB;Database=epldb;Trusted_Connection=True;TrustServerCertificate=True;` | Optional alt for Windows-only devs |
| Azure SQL (SQL auth, fallback) | `Server=tcp:<server>.database.windows.net,1433;Database=epldb;User Id=<u>;Password=<p>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;` | Use Key Vault — never commit |
| Azure SQL (Managed Identity, **preferred** in prod) | `Server=tcp:<server>.database.windows.net,1433;Database=epldb;Authentication=Active Directory Default;Encrypt=True;` | No password — grants come from `db_datareader` + `db_datawriter` roles assigned to the App Service's managed identity |
