using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class SeasonGameConfig : IEntityTypeConfiguration<SeasonGame>
{
    public void Configure(EntityTypeBuilder<SeasonGame> b)
    {
        b.HasKey(sg => sg.Id);

        b.Property(sg => sg.Venue).HasMaxLength(200);
        b.Property(sg => sg.Categories).HasMaxLength(200);
        b.Property(sg => sg.WhatsAppGroupUrl).HasMaxLength(400);
        b.Property(sg => sg.CardImageUrl).HasMaxLength(400);

        b.HasOne(sg => sg.Season)
            .WithMany(s => s.Games)
            .HasForeignKey(sg => sg.SeasonId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(sg => sg.Game)
            .WithMany(g => g.SeasonGames)
            .HasForeignKey(sg => sg.GameId)
            .OnDelete(DeleteBehavior.Restrict);

        // No two SeasonGame rows for the same (Season, Game) combo.
        b.HasIndex(sg => new { sg.SeasonId, sg.GameId }).IsUnique();

        // Contacts as a JSON column inside the SeasonGame row.
        b.OwnsMany(sg => sg.Contacts, c =>
        {
            c.ToJson();
            c.Property(p => p.Name).HasMaxLength(80);
            c.Property(p => p.PhoneDisplay).HasMaxLength(20);
            c.Property(p => p.PhoneE164).HasMaxLength(20);
        });
    }
}
