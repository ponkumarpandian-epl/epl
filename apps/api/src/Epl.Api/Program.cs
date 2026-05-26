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
using Microsoft.OpenApi.Models;
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
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
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

// ── MVC + Swagger ──────────────────────────────────────────────────────────
builder.Services.AddControllers().AddJsonOptions(o =>
{
    // Controllers have their own JSON config (Minimal API uses ConfigureHttpJsonOptions).
    o.JsonSerializerOptions.PropertyNamingPolicy   = JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "EPL API",
        Version     = "v1",
        Description = "Electronic-City Premier League — auth, team registration, admin.",
    });
    // Disambiguate types that share a simple name across namespaces
    // (e.g. our Epl.Application.Auth.Dtos.RegisterRequest vs
    //       Microsoft.AspNetCore.Identity.Data.RegisterRequest from MapIdentityApi).
    o.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);
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

app.UseSwagger();
app.UseSwaggerUI(o => { o.SwaggerEndpoint("v1/swagger.json", "EPL API v1"); o.RoutePrefix = "swagger"; });

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
// ExcludeFromDescription: MapIdentityApi emits endpoints whose request/response
// types collide in Swashbuckle's schema generator and break /swagger/v1/swagger.json.
// The endpoints still work at runtime — they just don't appear in the OpenAPI doc.
app.MapGroup("/identity").MapIdentityApi<AppUser>().ExcludeFromDescription();

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
