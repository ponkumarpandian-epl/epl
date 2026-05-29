using Epl.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Epl.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, AppRole, Guid>(options)
{
    public DbSet<Apartment>           Apartments          => Set<Apartment>();
    public DbSet<Team>                Teams               => Set<Team>();
    public DbSet<TeamMember>          TeamMembers         => Set<TeamMember>();
    public DbSet<Game>                Games               => Set<Game>();
    public DbSet<Season>              Seasons             => Set<Season>();
    public DbSet<SeasonGame>          SeasonGames         => Set<SeasonGame>();
    public DbSet<UserGameSkill>       UserGameSkills      => Set<UserGameSkill>();
    public DbSet<Tournament>          Tournaments         => Set<Tournament>();
    public DbSet<TournamentCategory>  TournamentCategories => Set<TournamentCategory>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
