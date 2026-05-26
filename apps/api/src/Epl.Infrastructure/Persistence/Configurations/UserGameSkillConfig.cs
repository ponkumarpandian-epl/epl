using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class UserGameSkillConfig : IEntityTypeConfiguration<UserGameSkill>
{
    public void Configure(EntityTypeBuilder<UserGameSkill> b)
    {
        b.HasKey(s => new { s.UserId, s.GameId });

        b.Property(s => s.Level).HasConversion<int>().IsRequired();

        b.HasOne(s => s.User)
            .WithMany(u => u.Skills)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(s => s.Game)
            .WithMany()
            .HasForeignKey(s => s.GameId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(s => s.UserId);
    }
}
