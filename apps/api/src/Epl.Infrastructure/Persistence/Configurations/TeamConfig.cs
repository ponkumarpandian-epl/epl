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
        b.Property(t => t.PaidTo).HasMaxLength(80);

        b.HasOne(t => t.Apartment)
         .WithMany(a => a.Teams)
         .HasForeignKey(t => t.ApartmentId)
         .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(t => t.CreatedBy)
         .WithMany(u => u.CaptainedTeams)
         .HasForeignKey(t => t.CreatedByUserId)
         .IsRequired(false)
         .OnDelete(DeleteBehavior.SetNull);

        // Captain — real FK to AppUser. Nullable while the backfill from
        // CaptainMobile → AppUser.PhoneNumber runs, and for legacy rows where
        // the registrant hasn't signed up yet.
        //
        // ON DELETE NO ACTION (not SetNull) because Teams already has
        // CreatedByUserId → AspNetUsers ON DELETE SET NULL — two SetNull paths
        // from the same parent table trip SQL Server's "multiple cascade paths"
        // check. A user delete is rare + admin-handled (transfer captaincy
        // first), so blocking the cascade is the right default.
        b.HasOne(t => t.Captain)
         .WithMany()
         .HasForeignKey(t => t.CaptainUserId)
         .IsRequired(false)
         .OnDelete(DeleteBehavior.NoAction);

        b.HasIndex(t => t.CaptainUserId);

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
