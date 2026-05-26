using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class AppUserConfig : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> b)
    {
        b.Property(u => u.FullName).HasMaxLength(120).IsRequired();
        b.Property(u => u.AvatarUrl).HasMaxLength(400);
        // PhoneNumber + Email indexes are provided by IdentityDbContext defaults.
    }
}
