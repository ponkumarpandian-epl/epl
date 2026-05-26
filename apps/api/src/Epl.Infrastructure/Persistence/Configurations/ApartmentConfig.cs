using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class ApartmentConfig : IEntityTypeConfiguration<Apartment>
{
    public void Configure(EntityTypeBuilder<Apartment> b)
    {
        b.HasKey(a => a.Id);

        b.Property(a => a.Name).HasMaxLength(120).IsRequired();
        b.Property(a => a.Address).HasMaxLength(400).IsRequired();
        b.Property(a => a.MapProvider).HasMaxLength(16).HasDefaultValue("osm");

        // Coordinates rounded server-side to 6 decimals so the unique index can dedup.
        b.Property(a => a.Lat).HasColumnType("float").IsRequired();
        b.Property(a => a.Lng).HasColumnType("float").IsRequired();

        b.HasIndex(a => new { a.Lat, a.Lng, a.Name }).IsUnique();
    }
}
