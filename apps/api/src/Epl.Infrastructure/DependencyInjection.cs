using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Persistence;
using Epl.Infrastructure.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Epl.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var conn = config.GetConnectionString("Sql")
            ?? throw new InvalidOperationException("ConnectionStrings:Sql is required.");

        services.AddDbContext<AppDbContext>(o => o.UseSqlServer(conn, sql =>
        {
            sql.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
            sql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name);
        }));

        services.AddScoped<IUnitOfWork, UnitOfWork.UnitOfWork>();
        services.AddSingleton<IProfileImageStore, LocalProfileImageStore>();

        // Identity core + role manager + sign-in manager + EF stores
        services
            .AddIdentityCore<AppUser>(o =>
            {
                o.User.RequireUniqueEmail     = false;     // mobile-only users allowed
                o.Password.RequiredLength     = 8;
                o.Password.RequireNonAlphanumeric = false;
                o.Lockout.MaxFailedAccessAttempts = 5;
                o.Lockout.DefaultLockoutTimeSpan  = TimeSpan.FromMinutes(15);
                o.SignIn.RequireConfirmedAccount  = false;
            })
            .AddRoles<AppRole>()
            .AddRoleManager<RoleManager<AppRole>>()
            .AddSignInManager<SignInManager<AppUser>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddApiEndpoints();

        return services;
    }
}
