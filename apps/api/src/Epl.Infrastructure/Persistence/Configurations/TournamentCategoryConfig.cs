using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class TournamentCategoryConfig : IEntityTypeConfiguration<TournamentCategory>
{
    public void Configure(EntityTypeBuilder<TournamentCategory> b)
    {
        b.HasKey(c => c.Id);

        b.Property(c => c.Name).IsRequired().HasMaxLength(60);

        b.HasOne(c => c.Tournament)
            .WithMany(t => t.Categories)
            .HasForeignKey(c => c.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);

        // One category per format per tournament — no two "Men's Doubles" rows in the same event.
        b.HasIndex(c => new { c.TournamentId, c.Format }).IsUnique();
    }
}
