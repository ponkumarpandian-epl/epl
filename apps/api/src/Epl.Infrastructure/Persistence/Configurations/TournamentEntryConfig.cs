using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class TournamentEntryConfig : IEntityTypeConfiguration<TournamentEntry>
{
    public void Configure(EntityTypeBuilder<TournamentEntry> b)
    {
        b.HasKey(e => e.Id);

        b.Property(e => e.Player1Name).IsRequired().HasMaxLength(80);
        b.Property(e => e.Player1Mobile).IsRequired().HasMaxLength(20);
        b.Property(e => e.Player2Name).HasMaxLength(80);
        b.Property(e => e.Player2Mobile).HasMaxLength(20);
        b.Property(e => e.TeamLabel).HasMaxLength(80);

        b.Property(e => e.Status).HasConversion<int>();

        b.HasOne(e => e.TournamentCategory)
            .WithMany()
            .HasForeignKey(e => e.TournamentCategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        // One entry per primary-mobile per category — blocks accidental double-registration.
        // Filtered to exclude Withdrawn so a withdrawn entry doesn't block a re-registration.
        b.HasIndex(e => new { e.TournamentCategoryId, e.Player1Mobile })
            .IsUnique()
            .HasFilter("[Status] <> 3");

        b.HasIndex(e => e.TournamentCategoryId);
    }
}
