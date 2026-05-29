using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class TeamMemberConfig : IEntityTypeConfiguration<TeamMember>
{
    public void Configure(EntityTypeBuilder<TeamMember> b)
    {
        b.HasKey(m => m.Id);

        b.Property(m => m.ShirtNumber).HasMaxLength(8);
        b.Property(m => m.Position).HasMaxLength(40);

        b.HasOne(m => m.Team)
            .WithMany(t => t.Members)
            .HasForeignKey(m => m.TeamId)
            .OnDelete(DeleteBehavior.Cascade);

        // The player. Restrict on delete — losing an AppUser shouldn't silently delete
        // their entire roster history; admin should soft-delete the member rows first.
        b.HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Filtered unique index — same player can't be Active on the same team twice,
        // but Removed history rows are allowed (and required for audit / re-add).
        b.HasIndex(m => new { m.TeamId, m.UserId })
            .IsUnique()
            .HasFilter("[Status] = 1");   // TeamMemberStatus.Active

        // Lookup index for "teams I'm on" and "who's been added to / removed from teams".
        b.HasIndex(m => new { m.UserId, m.Status });
    }
}
