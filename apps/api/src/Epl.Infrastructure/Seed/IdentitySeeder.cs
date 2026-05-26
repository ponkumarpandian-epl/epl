using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Epl.Infrastructure.Seed;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider sp)
    {
        var log         = sp.GetRequiredService<ILogger<IdentitySeederMarker>>();
        var roleManager = sp.GetRequiredService<RoleManager<AppRole>>();
        var userManager = sp.GetRequiredService<UserManager<AppUser>>();
        var config      = sp.GetRequiredService<IConfiguration>();

        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new AppRole(role));
                log.LogInformation("Seeded role {Role}", role);
            }
        }

        var adminEmail    = config["Bootstrap:AdminEmail"];
        var adminPassword = config["Bootstrap:AdminPassword"];
        var adminFullName = config["Bootstrap:AdminFullName"] ?? "EPL Admin";

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            log.LogWarning("Bootstrap admin not configured (Bootstrap:AdminEmail/AdminPassword) — skipping admin seed.");
            return;
        }

        var existing = await userManager.FindByEmailAsync(adminEmail);
        if (existing is not null)
        {
            if (!await userManager.IsInRoleAsync(existing, Roles.Admin))
            {
                await userManager.AddToRoleAsync(existing, Roles.Admin);
                log.LogInformation("Promoted existing user {Email} to Admin", adminEmail);
            }
            return;
        }

        var admin = new AppUser
        {
            UserName       = adminEmail,
            Email          = adminEmail,
            EmailConfirmed = true,
            FullName       = adminFullName,
        };

        var create = await userManager.CreateAsync(admin, adminPassword);
        if (!create.Succeeded)
        {
            log.LogError("Failed to seed admin user: {Errors}", string.Join("; ", create.Errors.Select(e => $"{e.Code}:{e.Description}")));
            return;
        }

        await userManager.AddToRoleAsync(admin, Roles.Admin);
        log.LogInformation("Seeded bootstrap Admin user {Email}", adminEmail);
    }

    private class IdentitySeederMarker { }
}
