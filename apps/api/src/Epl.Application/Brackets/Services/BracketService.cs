using Epl.Application.Brackets.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Brackets.Services;

public class BracketService(IUnitOfWork uow, ILogger<BracketService> log) : IBracketService
{
    private const string PARENT_CATEGORY = "TournamentCategory";

    // ── Reads ──────────────────────────────────────────────────────────────

    public async Task<BracketViewDto?> GetPublicAsync(Guid bracketId, CancellationToken ct = default)
    {
        var b = await uow.Brackets.GetFullAsync(bracketId, ct);
        return b is null || !b.IsPublished ? null : ToViewDto(b);
    }

    public async Task<BracketViewDto?> GetPublicByParentAsync(string parentType, Guid parentId, CancellationToken ct = default)
    {
        var b = await uow.Brackets.GetByParentAsync(parentType, parentId, ct);
        return b is null || !b.IsPublished ? null : ToViewDto(b);
    }

    public async Task<BracketViewDto?> GetForAdminAsync(Guid bracketId, CancellationToken ct = default)
    {
        var b = await uow.Brackets.GetFullAsync(bracketId, ct);
        return b is null ? null : ToViewDto(b);
    }

    public async Task<BracketViewDto?> GetByParentForAdminAsync(string parentType, Guid parentId, CancellationToken ct = default)
    {
        var b = await uow.Brackets.GetByParentAsync(parentType, parentId, ct);
        return b is null ? null : ToViewDto(b);
    }

    // ── Writes ─────────────────────────────────────────────────────────────

    public async Task<Result<BracketViewDto>> CreateAsync(CreateBracketRequest req, CancellationToken ct = default)
    {
        if (req.ParentType != PARENT_CATEGORY)
            return Result<BracketViewDto>.Fail("unsupported_parent", $"ParentType '{req.ParentType}' is not supported yet.");

        if (req.Format != DrawFormat.SingleElimination)
            return Result<BracketViewDto>.Fail("unsupported_format", "Only SingleElimination is supported in T-3. RoundRobin / GroupKnockout land in T-5.");

        // One bracket per category (service-enforced; no DB unique on the polymorphic index).
        var existing = await uow.Brackets.GetByParentAsync(req.ParentType, req.ParentId, ct);
        if (existing is not null)
            return Result<BracketViewDto>.Fail("bracket_exists", "A bracket already exists for this category. Edit it instead.");

        // Verify the parent category exists.
        var category = await uow.TournamentCategories.GetByIdAsync(req.ParentId, ct);
        if (category is null)
            return Result<BracketViewDto>.Fail("category_not_found", "Tournament category not found.");

        var bracket = new Bracket
        {
            ParentType  = req.ParentType,
            ParentId    = req.ParentId,
            Format      = req.Format,
            IsPublished = false,
            // Defaults inherited (BWF standard) — admin can tune from the bracket editor (T-7).
        };

        // Auto-seed from the category's Confirmed entries so the admin sees something useful.
        var confirmed = (await uow.TournamentEntries.ListByCategoryAsync(category.Id, ct))
            .Where(e => e.Status == EntryStatus.Confirmed)
            .ToList();

        var seeds = confirmed
            .OrderBy(e => e.Seed ?? int.MaxValue)
            .ThenBy(e => e.CreatedAt)
            .Select((e, i) => new SeedItem(
                ParticipantId: null,
                SourceEntryId: e.Id,
                DisplayName:   ComposeName(e),
                Seed:          e.Seed ?? (i + 1),
                IsBye:         false))
            .ToList();

        uow.Brackets.Add(bracket);

        if (seeds.Count >= 2)
        {
            BuildSingleElim(bracket, seeds);
        }

        await uow.SaveChangesAsync(ct);
        log.LogInformation(
            "Created bracket {BracketId} parent={Parent} format={Format} participants={Count}",
            bracket.Id, $"{req.ParentType}:{req.ParentId}", req.Format, seeds.Count);

        var refreshed = await uow.Brackets.GetFullAsync(bracket.Id, ct);
        return Result<BracketViewDto>.Ok(ToViewDto(refreshed!));
    }

    public async Task<Result<BracketViewDto>> SeedAsync(Guid bracketId, SeedBracketRequest req, CancellationToken ct = default)
    {
        var bracket = await uow.Brackets.GetByIdAsync(bracketId, ct);
        if (bracket is null)
            return Result<BracketViewDto>.Fail("bracket_not_found", "Bracket not found.");

        if (bracket.Format != DrawFormat.SingleElimination)
            return Result<BracketViewDto>.Fail("unsupported_format", "Only SingleElimination is supported in T-3.");

        // Refuse to reseed if any match has started — protects the per-match Rules snapshot's audit trail.
        if (await uow.Brackets.AnyMatchStartedAsync(bracketId, ct))
            return Result<BracketViewDto>.Fail("bracket_locked", "This bracket has matches in progress — can't reseed.");

        // Wipe existing children with bulk DELETE — bracket itself stays.
        await uow.Brackets.ClearChildrenAsync(bracketId, ct);

        var seeds = req.Participants
            .Where(p => !string.IsNullOrWhiteSpace(p.DisplayName))
            .OrderBy(p => p.Seed ?? int.MaxValue)
            .ToList();

        if (seeds.Count >= 2)
        {
            BuildSingleElim(bracket, seeds);
        }

        await uow.SaveChangesAsync(ct);
        log.LogInformation("Reseeded bracket {BracketId} participants={Count}", bracketId, seeds.Count);

        var refreshed = await uow.Brackets.GetFullAsync(bracketId, ct);
        return Result<BracketViewDto>.Ok(ToViewDto(refreshed!));
    }

    public async Task<Result<BracketViewDto>> PublishAsync(Guid bracketId, bool publish, CancellationToken ct = default)
    {
        var bracket = await uow.Brackets.GetByIdAsync(bracketId, ct);
        if (bracket is null)
            return Result<BracketViewDto>.Fail("bracket_not_found", "Bracket not found.");

        bracket.IsPublished = publish;
        await uow.SaveChangesAsync(ct);
        log.LogInformation("Bracket {BracketId} published={Published}", bracketId, publish);

        var refreshed = await uow.Brackets.GetFullAsync(bracketId, ct);
        return Result<BracketViewDto>.Ok(ToViewDto(refreshed!));
    }

    // ── SingleElim generator (inline; will move to IBracketGenerator strategy in T-5) ──

    /// <summary>
    /// Adds Participants + Rounds + Matches to the bracket. Pads to next power of 2 with BYEs;
    /// places seeds via standard knockout positioning (1 vs lowest, 2 vs 2nd-lowest, …);
    /// auto-advances any first-round match where one side is a BYE.
    /// </summary>
    private static void BuildSingleElim(Bracket bracket, IReadOnlyList<SeedItem> rawSeeds)
    {
        // 1. Normalise + pad to next power of 2.
        var realCount = rawSeeds.Count;
        if (realCount < 2) return;
        var bracketSize = NextPowerOfTwo(realCount);
        var byeCount    = bracketSize - realCount;

        // Sort by seed asc — null/0 sink to the end and get the bottom positions.
        var seeded = rawSeeds
            .OrderBy(s => s.Seed ?? int.MaxValue)
            .Select((s, i) => new SeedItem(
                ParticipantId: s.ParticipantId,
                SourceEntryId: s.SourceEntryId,
                DisplayName:   s.DisplayName,
                Seed:          i + 1,                    // re-number 1..N so generator math is clean
                IsBye:         s.IsBye))
            .ToList();

        // 2. Build Participants list (real ones + BYE placeholders).
        var participants = new List<BracketParticipant>(bracketSize);
        foreach (var s in seeded)
        {
            participants.Add(new BracketParticipant
            {
                BracketId     = bracket.Id,
                DisplayName   = s.DisplayName,
                Seed          = s.Seed,
                SourceEntryId = s.SourceEntryId,
                IsBye         = false,
            });
        }
        for (int i = 0; i < byeCount; i++)
        {
            participants.Add(new BracketParticipant
            {
                BracketId   = bracket.Id,
                DisplayName = "BYE",
                Seed        = realCount + i + 1,
                IsBye       = true,
            });
        }

        foreach (var p in participants) bracket.Participants.Add(p);

        // 3. Slot positions for first round — standard knockout (1 vs N, 4 vs 5, 2 vs N-1, 3 vs N-2 etc).
        var firstRoundOrder = BracketOrder(bracketSize); // each entry is a seed number 1..bracketSize
        var bySeedNumber    = participants.ToDictionary(p => p.Seed!.Value);
        var firstRoundParticipants = firstRoundOrder.Select(seed => bySeedNumber[seed]).ToList();

        // 4. Build rounds.
        var numRounds = (int)Math.Log2(bracketSize);
        var rounds = new List<BracketRound>(numRounds);
        for (int r = 0; r < numRounds; r++)
        {
            // Round 0 = first round (largest); last round = Final.
            var matchesInRound = bracketSize >> (r + 1);  // 8 → 4, 2, 1 for r=0..2
            rounds.Add(new BracketRound
            {
                BracketId  = bracket.Id,
                OrderIndex = r,
                Name       = RoundName(r, numRounds, matchesInRound),
            });
        }
        foreach (var r in rounds) bracket.Rounds.Add(r);

        // 5. Build matches — start from the FINAL and walk back so NextMatchId is set at creation time.
        // matchesByRound[r] holds the matches in display order top-to-bottom.
        var matchesByRound = new List<Match>[numRounds];
        for (int r = numRounds - 1; r >= 0; r--)
        {
            var matchCount    = bracketSize >> (r + 1);
            matchesByRound[r] = new List<Match>(matchCount);
            for (int slot = 0; slot < matchCount; slot++)
            {
                var match = new Match
                {
                    BracketId         = bracket.Id,
                    RoundId           = rounds[r].Id,
                    SlotIndex         = slot,
                    Status            = MatchStatus.Pending,
                    RulesBestOf       = bracket.DefaultBestOf,
                    RulesPointsToWin  = bracket.DefaultPointsToWin,
                    RulesWinByMargin  = bracket.DefaultWinByMargin,
                    RulesPointCap     = bracket.DefaultPointCap,
                    // First round gets participants assigned; later rounds get them from advancement.
                    ParticipantAId = r == 0 ? firstRoundParticipants[slot * 2].Id     : null,
                    ParticipantBId = r == 0 ? firstRoundParticipants[slot * 2 + 1].Id : null,
                };
                // NextMatchId points at the match in the next round at slot/2.
                if (r < numRounds - 1)
                {
                    match.NextMatchId = matchesByRound[r + 1][slot / 2].Id;
                }
                matchesByRound[r].Add(match);
                bracket.Matches.Add(match);
            }
        }

        // 6. Auto-advance any first-round match with a BYE — winner is the non-bye side.
        foreach (var match in matchesByRound[0])
        {
            var a = match.ParticipantAId is { } aId ? bracket.Participants.First(p => p.Id == aId) : null;
            var b = match.ParticipantBId is { } bId ? bracket.Participants.First(p => p.Id == bId) : null;
            var aBye = a?.IsBye ?? false;
            var bBye = b?.IsBye ?? false;
            if (aBye == bBye) continue;     // both real or both BYE (the latter shouldn't happen)
            var winner = aBye ? b : a;
            match.WinnerParticipantId = winner!.Id;
            match.Status              = MatchStatus.Walkover;
            // Propagate the winner into the next match's free slot.
            if (match.NextMatchId is { } nextId)
            {
                var next = bracket.Matches.First(m => m.Id == nextId);
                if (next.ParticipantAId is null)      next.ParticipantAId = winner.Id;
                else if (next.ParticipantBId is null) next.ParticipantBId = winner.Id;
            }
        }
    }

    /// <summary>
    /// Standard bracket positioning. For size=8: [1, 8, 4, 5, 2, 7, 3, 6] — seed 1 vs 8,
    /// then 4 vs 5 in the same SF half, then 2 vs 7, 3 vs 6 in the other half.
    /// </summary>
    private static List<int> BracketOrder(int size)
    {
        if (size == 1) return new List<int> { 1 };
        var prev = BracketOrder(size / 2);
        var result = new List<int>(size);
        foreach (var s in prev)
        {
            result.Add(s);
            result.Add(size + 1 - s);
        }
        return result;
    }

    private static int NextPowerOfTwo(int n)
    {
        if (n < 2) return 2;
        int p = 1;
        while (p < n) p <<= 1;
        return p;
    }

    private static string RoundName(int orderIndex, int numRounds, int matchesInRound) => (numRounds - orderIndex) switch
    {
        1 => "Final",
        2 => "Semifinals",
        3 => "Quarterfinals",
        _ => $"Round of {matchesInRound * 2}",
    };

    private static string ComposeName(TournamentEntry e) =>
        string.IsNullOrWhiteSpace(e.Player2Name)
            ? e.Player1Name
            : $"{e.Player1Name} / {e.Player2Name}";

    // ── Mappers ────────────────────────────────────────────────────────────

    private static BracketViewDto ToViewDto(Bracket b)
    {
        var participants = b.Participants
            .OrderBy(p => p.Seed ?? int.MaxValue)
            .Select(p => new BracketParticipantDto(p.Id, p.DisplayName, p.Seed, p.IsBye, p.SourceEntryId))
            .ToList();

        var rounds = b.Rounds
            .OrderBy(r => r.OrderIndex)
            .Select(r => new BracketRoundDto(
                Id:         r.Id,
                OrderIndex: r.OrderIndex,
                Name:       r.Name,
                GroupLabel: r.GroupLabel,
                Matches:    b.Matches
                              .Where(m => m.RoundId == r.Id)
                              .OrderBy(m => m.SlotIndex)
                              .Select(m => new BracketMatchDto(
                                  Id:                  m.Id,
                                  RoundId:             m.RoundId,
                                  SlotIndex:           m.SlotIndex,
                                  ParticipantAId:      m.ParticipantAId,
                                  ParticipantBId:      m.ParticipantBId,
                                  WinnerParticipantId: m.WinnerParticipantId,
                                  Status:              m.Status,
                                  ScheduledAt:         m.ScheduledAt,
                                  Court:               m.Court,
                                  NextMatchId:         m.NextMatchId,
                                  RulesBestOf:         m.RulesBestOf,
                                  RulesPointsToWin:    m.RulesPointsToWin,
                                  RulesWinByMargin:    m.RulesWinByMargin,
                                  RulesPointCap:       m.RulesPointCap))
                              .ToList()))
            .ToList();

        return new BracketViewDto(
            Id:                 b.Id,
            ParentType:         b.ParentType,
            ParentId:           b.ParentId,
            Format:             b.Format,
            IsPublished:        b.IsPublished,
            DefaultBestOf:      b.DefaultBestOf,
            DefaultPointsToWin: b.DefaultPointsToWin,
            DefaultWinByMargin: b.DefaultWinByMargin,
            DefaultPointCap:    b.DefaultPointCap,
            Participants:       participants,
            Rounds:             rounds);
    }
}
