using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class SeasonConfig : IEntityTypeConfiguration<Season>
{
    public void Configure(EntityTypeBuilder<Season> b)
    {
        b.HasKey(s => s.Id);

        b.Property(s => s.Name).HasMaxLength(80).IsRequired();
        b.Property(s => s.Slug).HasMaxLength(40).IsRequired();
        b.Property(s => s.Tagline).HasMaxLength(200);

        b.HasIndex(s => s.Slug).IsUnique();
        // Only one season can be active; enforced via filtered unique index.
        b.HasIndex(s => s.IsActive)
            .HasFilter("[IsActive] = 1")
            .IsUnique();
    }
}
