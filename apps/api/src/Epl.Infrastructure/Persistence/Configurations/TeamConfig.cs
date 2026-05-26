using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class TeamConfig : IEntityTypeConfiguration<Team>
{
    public void Configure(EntityTypeBuilder<Team> b)
    {
        b.HasKey(t => t.Id);

        b.Property(t => t.Name).HasMaxLength(60).IsRequired();
        b.Property(t => t.CaptainName).HasMaxLength(80).IsRequired();
        b.Property(t => t.CaptainMobile).HasMaxLength(20).IsRequired();
        b.Property(t => t.Sport).HasConversion<int>().IsRequired();

        b.HasOne(t => t.Apartment)
         .WithMany(a => a.Teams)
         .HasForeignKey(t => t.ApartmentId)
         .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(t => t.CreatedBy)
         .WithMany(u => u.CaptainedTeams)
         .HasForeignKey(t => t.CreatedByUserId)
         .IsRequired(false)
         .OnDelete(DeleteBehavior.SetNull);

        // Link to the SeasonGame the team registered for.
        // Nullable so legacy rows survive; new code requires it.
        b.HasOne(t => t.SeasonGame)
         .WithMany(sg => sg.Teams)
         .HasForeignKey(t => t.SeasonGameId)
         .IsRequired(false)
         .OnDelete(DeleteBehavior.Restrict);

        // No two teams with the same name in the same apartment for the same sport.
        b.HasIndex(t => new { t.Sport, t.Name, t.ApartmentId }).IsUnique();
    }
}
