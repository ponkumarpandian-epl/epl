using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Epl.Api.Middleware;
using Epl.Application;
using Epl.Application.Authorization;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Epl.Infrastructure;
using Epl.Infrastructure.Persistence;
using Epl.Infrastructure.Seed;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;
using SharpGrip.FluentValidation.AutoValidation.Mvc.Extensions;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ──────────────────────────────────────────────────────────────────
builder.Host.UseSerilog((ctx, sp, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {SourceContext}:: {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/epl-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        outputTemplate:
        "{Timestamp:o} [{Level:u3}] {CorrelationId} {SourceContext}:: {Message:lj} {Properties:j}{NewLine}{Exception}"));

// ── JSON ────────────────────────────────────────────────────────────────────
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    // Enums travel as their declared name (Cricket/Badminton/Volleyball) — no naming policy.
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

// ── App / Infra / Validation ────────────────────────────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddFluentValidationAutoValidation(c =>
{
    // Auto-validate request DTOs via FluentValidation; failures return 400 with the field-error map.
    c.DisableBuiltInModelValidation = true;
});

// ── Cookie auth (browser-friendly) ──────────────────────────────────────────
// Register BOTH cookies AND bearer schemes so MapIdentityApi works whichever
// mode the caller picks. The browser flow sends ?useCookies=true and uses
// IdentityConstants.ApplicationScheme (cookies); a missing query param falls
// back to IdentityConstants.BearerScheme and returns a JWT in JSON. Without
// the bearer registration the fallback throws:
//   "No sign-in authentication handler is registered for the scheme 'Identity.Bearer'."
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddBearerToken(IdentityConstants.BearerScheme)
    .AddIdentityCookies();

builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name        = "epl.auth";
    o.Cookie.HttpOnly    = true;
    o.Cookie.SameSite    = SameSiteMode.Lax;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    o.SlidingExpiration  = true;
    o.ExpireTimeSpan     = TimeSpan.FromDays(30);
    o.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    o.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// ── Authorization policies ──────────────────────────────────────────────────
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy(AuthorizationPolicies.AdminOnly,     p => p.RequireRole(Roles.Admin));
    o.AddPolicy(AuthorizationPolicies.PlayerOrAdmin, p => p.RequireRole(Roles.Player, Roles.Admin));
    o.AddPolicy(AuthorizationPolicies.UmpireOrAdmin, p => p.RequireRole(Roles.Umpire, Roles.Admin));
});

// ── CORS (browser dev) ──────────────────────────────────────────────────────
builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins("http://localhost:3000")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// ── MVC + OpenAPI ──────────────────────────────────────────────────────────
builder.Services.AddControllers().AddJsonOptions(o =>
{
    // Controllers have their own JSON config (Minimal API uses ConfigureHttpJsonOptions).
    o.JsonSerializerOptions.PropertyNamingPolicy   = JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
// .NET 10 built-in OpenAPI (Microsoft.AspNetCore.OpenApi). Swashbuckle 7.x
// doesn't fully support .NET 10's OpenAPI runtime and throws on doc generation.
builder.Services.AddOpenApi("v1", o =>
{
    o.AddDocumentTransformer((doc, _, _) =>
    {
        doc.Info.Title       = "EPL API";
        doc.Info.Version     = "v1";
        doc.Info.Description = "Electronic-City Premier League — auth, team registration, admin.";
        return Task.CompletedTask;
    });
});

var app = builder.Build();

// ── Pipeline ────────────────────────────────────────────────────────────────
app.UseSerilogRequestLogging(opts =>
{
    opts.EnrichDiagnosticContext = (diag, http) =>
    {
        var uid = http.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        diag.Set("UserId",   uid ?? "(anonymous)");
        diag.Set("ClientIp", http.Connection.RemoteIpAddress?.ToString());
    };
});

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

// OpenAPI doc at /openapi/v1.json + Scalar UI at /scalar/v1.
// Keep /swagger as a redirect for the legacy bookmark.
app.MapOpenApi();
app.MapScalarApiReference();
app.MapGet("/swagger", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();

app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new
{
    service = "epl-api",
    status  = "ok",
    utc     = DateTimeOffset.UtcNow,
})).WithTags("Health");

// Built-in identity API: /identity/login, /identity/refresh, /identity/register, etc.
// NOTE: MapIdentityApi does NOT ship a /logout endpoint. We add one explicitly so
// SignInManager.SignOutAsync() can issue a cookie-clearing Set-Cookie response.
app.MapGroup("/identity").MapIdentityApi<AppUser>();

app.MapPost("/identity/logout", async (SignInManager<AppUser> signInManager) =>
{
    await signInManager.SignOutAsync();
    return Results.Ok(new { ok = true });
})
.WithTags("Identity")
.WithSummary("Sign out (clears the auth cookie)")
.AllowAnonymous();   // safe — no-op if there's no cookie

app.MapControllers();

// ── Apply migrations + seed roles + bootstrap admin + games/seasons ─────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await IdentitySeeder.SeedAsync(scope.ServiceProvider);
    await DataSeeder.SeedAsync(scope.ServiceProvider);
}

app.Run();
