using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class TeamMemberConfig : IEntityTypeConfiguration<TeamMember>
{
    public void Configure(EntityTypeBuilder<TeamMember> b)
    {
        b.HasKey(m => m.Id);

        b.Property(m => m.ShirtNumber).HasMaxLength(10);
        b.Property(m => m.Position).HasMaxLength(60);

        b.Property(m => m.Status)
            .HasConversion<int>()
            .IsRequired()
            .HasDefaultValue(TeamMemberStatus.Active);

        b.HasOne(m => m.Team)
         .WithMany(t => t.Members)
         .HasForeignKey(m => m.TeamId)
         .OnDelete(DeleteBehavior.Cascade);

        b.Property(m => m.PlaceholderName).HasMaxLength(80);
        b.Property(m => m.PlaceholderMobile).HasMaxLength(20);

        // No reverse collection on AppUser — "teams I'm on" is a query, not a nav,
        // to avoid colliding with the existing (registrant-bound) CaptainedTeams.
        b.HasOne(m => m.User)
         .WithMany()
         .HasForeignKey(m => m.UserId)
         .IsRequired(false)
         .OnDelete(DeleteBehavior.Restrict);

        // Same number can't be a placeholder twice on one team (Active only).
        b.HasIndex(m => new { m.TeamId, m.PlaceholderMobile })
            .IsUnique()
            .HasFilter("[Status] = 1 AND [UserId] IS NULL");

        // A row is EITHER a real member (UserId set) OR a placeholder (name+mobile set).
        b.ToTable(t => t.HasCheckConstraint("CK_TeamMembers_Identity",
            "([UserId] IS NOT NULL AND [PlaceholderName] IS NULL AND [PlaceholderMobile] IS NULL) " +
            "OR ([UserId] IS NULL AND [PlaceholderName] IS NOT NULL AND [PlaceholderMobile] IS NOT NULL)"));

        // A user can't have two Active rows on the same team. Removed rows are kept
        // as history, so the uniqueness is filtered to Active only.
        b.HasIndex(m => new { m.TeamId, m.UserId })
            .IsUnique()
            .HasFilter("[Status] = 1");

        // "Teams I'm on" lookup.
        b.HasIndex(m => new { m.UserId, m.Status });
    }
}
