using Epl.Application.Auth.Services;
using Epl.Application.Brackets.Services;
using Epl.Application.Gallery.Services;
using Epl.Application.Profile.Services;
using Epl.Application.Seasons.Services;
using Epl.Application.Teams.Services;
using Epl.Application.Tournaments.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Epl.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IAuthService,       AuthService>();
        services.AddScoped<ITeamService,       TeamService>();
        services.AddScoped<IGalleryService,    GalleryService>();
        services.AddScoped<ISeasonService,     SeasonService>();
        services.AddScoped<IProfileService,    ProfileService>();
        services.AddScoped<ITournamentService,      TournamentService>();
        services.AddScoped<ITournamentEntryService, TournamentEntryService>();
        services.AddScoped<IBracketService,         BracketService>();

        return services;
    }
}
