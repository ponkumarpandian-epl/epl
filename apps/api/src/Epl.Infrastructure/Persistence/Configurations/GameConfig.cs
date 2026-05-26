using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class GameConfig : IEntityTypeConfiguration<Game>
{
    public void Configure(EntityTypeBuilder<Game> b)
    {
        b.HasKey(g => g.Id);

        b.Property(g => g.Name).HasMaxLength(60).IsRequired();
        b.Property(g => g.Slug).HasMaxLength(40).IsRequired();
        b.Property(g => g.Kind).HasConversion<int>().IsRequired();
        b.Property(g => g.Description).HasMaxLength(800);
        b.Property(g => g.WhatsAppGroupUrl).HasMaxLength(400);

        b.HasIndex(g => g.Slug).IsUnique();
        b.HasIndex(g => g.Kind).IsUnique();   // one Game per Sport enum value
    }
}
