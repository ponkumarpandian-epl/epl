using Epl.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Epl.Infrastructure.Persistence.Configurations;

public class BracketConfig : IEntityTypeConfiguration<Bracket>
{
    public void Configure(EntityTypeBuilder<Bracket> b)
    {
        b.HasKey(x => x.Id);

        b.Property(x => x.ParentType).IsRequired().HasMaxLength(40);
        b.Property(x => x.Format).HasConversion<int>();

        // Polymorphic parent lookup — non-unique because a SeasonGame may have multiple
        // historical brackets (replays / re-seeded draws). For TournamentCategory the
        // expectation is one bracket per category, enforced in the service layer not the DB.
        b.HasIndex(x => new { x.ParentType, x.ParentId });

        b.HasMany(x => x.Participants)
            .WithOne(p => p.Bracket)
            .HasForeignKey(p => p.BracketId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Rounds)
            .WithOne(r => r.Bracket)
            .HasForeignKey(r => r.BracketId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(x => x.Matches)
            .WithOne(m => m.Bracket)
            .HasForeignKey(m => m.BracketId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class BracketRoundConfig : IEntityTypeConfiguration<BracketRound>
{
    public void Configure(EntityTypeBuilder<BracketRound> b)
    {
        b.HasKey(x => x.Id);

        b.Property(x => x.Name).IsRequired().HasMaxLength(60);
        b.Property(x => x.GroupLabel).HasMaxLength(40);

        b.HasIndex(x => new { x.BracketId, x.OrderIndex }).IsUnique();
    }
}

public class BracketParticipantConfig : IEntityTypeConfiguration<BracketParticipant>
{
    public void Configure(EntityTypeBuilder<BracketParticipant> b)
    {
        b.HasKey(x => x.Id);

        b.Property(x => x.DisplayName).IsRequired().HasMaxLength(160);

        b.HasIndex(x => x.BracketId);
        b.HasIndex(x => x.SourceEntryId);
    }
}

public class MatchConfig : IEntityTypeConfiguration<Match>
{
    public void Configure(EntityTypeBuilder<Match> b)
    {
        b.HasKey(x => x.Id);

        b.Property(x => x.Status).HasConversion<int>();
        b.Property(x => x.Court).HasMaxLength(40);

        b.HasOne(x => x.Round)
            .WithMany()
            .HasForeignKey(x => x.RoundId)
            .OnDelete(DeleteBehavior.Restrict);

        // Avoid cascade cycles between Match/Bracket/Round — Bracket cascades cover the cleanup.
        b.HasIndex(x => new { x.BracketId, x.RoundId, x.SlotIndex }).IsUnique();
        b.HasIndex(x => x.NextMatchId);
    }
}
