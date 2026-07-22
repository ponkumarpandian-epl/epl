using Azure.Identity;
using Azure.Storage.Blobs;
using Epl.Application.Common.Caching;
using Epl.Application.Gallery.Services;
using Epl.Domain.Abstractions;
using Epl.Domain.Entities;
using Epl.Infrastructure.Caching;
using Epl.Infrastructure.Persistence;
using Epl.Infrastructure.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

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

        // Process-level cache for low-volatility reads (Season, SeasonGame, Game master).
        // Singletons because the cache and its metric counters are shared across all requests.
        // SizeLimit keeps a stray key explosion from OOM-ing the App Service.
        services.AddMemoryCache(o =>
        {
            o.SizeLimit = null; // No size cap — entries are small DTOs; revisit if heap grows.
        });
        services.AddSingleton<ICacheMetrics, InMemoryCacheMetrics>();
        services.AddSingleton<ICacheStore,   MemoryCacheStore>();

        services.Configure<GameGalleryOptions>(config.GetSection(GameGalleryOptions.SectionName));
        services.AddSingleton(sp =>
        {
            var options = sp.GetRequiredService<IOptions<GameGalleryOptions>>().Value;
            if (!string.IsNullOrWhiteSpace(options.ConnectionString))
                return new BlobServiceClient(options.ConnectionString);

            if (!Uri.TryCreate(options.AccountUri, UriKind.Absolute, out var accountUri))
                throw new InvalidOperationException("GameGallery:AccountUri must be an absolute URI.");

            return new BlobServiceClient(accountUri, new DefaultAzureCredential());
        });
        services.AddSingleton<IGameGallerySource, AzureGameGallerySource>();

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
