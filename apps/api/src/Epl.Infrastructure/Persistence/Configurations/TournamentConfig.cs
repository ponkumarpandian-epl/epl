using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class TournamentConfig : IEntityTypeConfiguration<Tournament>
{
    public void Configure(EntityTypeBuilder<Tournament> b)
    {
        b.HasKey(t => t.Id);

        b.Property(t => t.Name).IsRequired().HasMaxLength(120);
        b.Property(t => t.Slug).IsRequired().HasMaxLength(60);
        b.Property(t => t.Tagline).HasMaxLength(200);
        b.Property(t => t.Description).HasMaxLength(1200);
        b.Property(t => t.Venue).HasMaxLength(200);
        b.Property(t => t.BannerImageUrl).HasMaxLength(400);
        b.Property(t => t.WhatsAppGroupUrl).HasMaxLength(400);

        b.HasIndex(t => t.Slug).IsUnique();

        b.HasOne(t => t.Game)
            .WithMany()
            .HasForeignKey(t => t.GameId)
            .OnDelete(DeleteBehavior.Restrict);

        b.OwnsMany(t => t.Contacts, c =>
        {
            c.ToJson();
            c.Property(p => p.Name).HasMaxLength(80);
            c.Property(p => p.PhoneDisplay).HasMaxLength(20);
            c.Property(p => p.PhoneE164).HasMaxLength(20);
        });
    }
}
