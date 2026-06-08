using Epl.Application.Tournaments.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Tournaments.Services;

public class TournamentEntryService(IUnitOfWork uow, ILogger<TournamentEntryService> log) : ITournamentEntryService
{
    // ── Public ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TournamentEntryDto>> ListPublicAsync(Guid categoryId, CancellationToken ct = default)
    {
        var rows = await uow.TournamentEntries.ListByCategoryAsync(categoryId, ct);
        return rows
            .Where(e => e.Status != EntryStatus.Withdrawn)
            .Select(ToPublic)
            .ToList();
    }

    public async Task<TournamentCategoryCountsDto> GetCountsAsync(Guid categoryId, CancellationToken ct = default)
    {
        var (total, confirmed) = await uow.TournamentEntries.CountByCategoryAsync(categoryId, ct);
        return new TournamentCategoryCountsDto(categoryId, total, confirmed);
    }

    public async Task<Result<TournamentEntryDto>> RegisterAsync(
        string slug, Guid categoryId, RegisterTournamentEntryRequest req, Guid? userId, CancellationToken ct = default)
    {
        var tournament = await uow.Tournaments.GetBySlugAsync(slug, ct);
        if (tournament is null)
            return Result<TournamentEntryDto>.Fail("tournament_not_found", "Tournament not found.");

        if (!tournament.IsPublished)
            return Result<TournamentEntryDto>.Fail("tournament_not_published", "Tournament is not yet open for registration.");

        if (!tournament.RegistrationOpen)
            return Result<TournamentEntryDto>.Fail("registration_closed", "Registration is closed for this tournament.");

        // Deadline gate (UTC compare avoids local-time slips).
        if (tournament.RegistrationDeadline is { } deadline && deadline < DateTimeOffset.UtcNow)
            return Result<TournamentEntryDto>.Fail("registration_closed", "The registration deadline has passed.");

        var category = tournament.Categories.FirstOrDefault(c => c.Id == categoryId);
        if (category is null)
            return Result<TournamentEntryDto>.Fail("category_not_found", "Category not found in this tournament.");

        if (!category.RegistrationOpen)
            return Result<TournamentEntryDto>.Fail("registration_closed", $"{category.Name} is not accepting entries.");

        // Doubles formats require Player2; Singles must not include it.
        var isDoubles = category.Format != CategoryFormat.Singles;
        if (isDoubles && (string.IsNullOrWhiteSpace(req.Player2Name) || string.IsNullOrWhiteSpace(req.Player2Mobile)))
            return Result<TournamentEntryDto>.Fail("partner_required",
                $"{category.Name} is a doubles format — please add your partner's name and mobile.");

        // Cap check — count non-withdrawn entries against MaxEntries.
        var (total, _) = await uow.TournamentEntries.CountByCategoryAsync(category.Id, ct);
        if (total >= category.MaxEntries)
            return Result<TournamentEntryDto>.Fail("category_full",
                $"{category.Name} is full ({category.MaxEntries} entries).");

        // Double-registration check on Player1 mobile (the unique filtered index would also catch this
        // but we prefer a clean error code over a DbUpdateException).
        if (await uow.TournamentEntries.AnyActiveByMobileAsync(category.Id, req.Player1Mobile, ct))
            return Result<TournamentEntryDto>.Fail("duplicate_mobile",
                "This mobile number is already registered for this category.");

        var entry = new TournamentEntry
        {
            TournamentCategoryId = category.Id,
            Player1Name          = req.Player1Name.Trim(),
            Player1Mobile        = req.Player1Mobile.Trim(),
            Player1UserId        = userId,
            Player2Name          = isDoubles ? req.Player2Name?.Trim() : null,
            Player2Mobile        = isDoubles ? req.Player2Mobile?.Trim() : null,
            // Player2UserId stays null on the public path — we don't have a way to resolve the
            // partner's account just from their mobile. Admin can backfill later.
            Player2UserId        = null,
            TeamLabel            = string.IsNullOrWhiteSpace(req.TeamLabel) ? null : req.TeamLabel.Trim(),
            Status               = EntryStatus.Pending,
        };

        uow.TournamentEntries.Add(entry);
        await uow.SaveChangesAsync(ct);

        log.LogInformation(
            "Registered tournament entry {EntryId} for category {CategoryId} ({Format}) status=Pending userId={UserId}",
            entry.Id, category.Id, category.Format, userId);

        return Result<TournamentEntryDto>.Ok(ToPublic(entry));
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<AdminTournamentEntryDto>> ListForAdminAsync(Guid categoryId, CancellationToken ct = default)
    {
        var rows = await uow.TournamentEntries.ListByCategoryAsync(categoryId, ct);
        return rows.Select(ToAdmin).ToList();
    }

    public async Task<Result<AdminTournamentEntryDto>> SetSeedAsync(Guid entryId, int? seed, CancellationToken ct = default)
    {
        var entry = await uow.TournamentEntries.GetByIdAsync(entryId, ct);
        if (entry is null)
            return Result<AdminTournamentEntryDto>.Fail("entry_not_found", "Entry not found.");

        entry.Seed = seed;
        await uow.SaveChangesAsync(ct);
        return Result<AdminTournamentEntryDto>.Ok(ToAdmin(entry));
    }

    public async Task<Result<AdminTournamentEntryDto>> SetStatusAsync(Guid entryId, EntryStatus status, CancellationToken ct = default)
    {
        var entry = await uow.TournamentEntries.GetByIdAsync(entryId, ct);
        if (entry is null)
            return Result<AdminTournamentEntryDto>.Fail("entry_not_found", "Entry not found.");

        entry.Status = status;
        await uow.SaveChangesAsync(ct);
        log.LogInformation("Entry {EntryId} status -> {Status}", entryId, status);
        return Result<AdminTournamentEntryDto>.Ok(ToAdmin(entry));
    }

    // ── Mappers ────────────────────────────────────────────────────────────

    private static TournamentEntryDto ToPublic(TournamentEntry e) => new(
        Id:                   e.Id,
        TournamentCategoryId: e.TournamentCategoryId,
        Player1Name:          e.Player1Name,
        Player2Name:          e.Player2Name,
        TeamLabel:            e.TeamLabel,
        Seed:                 e.Seed,
        Status:               e.Status,
        CreatedAt:            e.CreatedAt);

    private static AdminTournamentEntryDto ToAdmin(TournamentEntry e) => new(
        Id:                   e.Id,
        TournamentCategoryId: e.TournamentCategoryId,
        Player1Name:          e.Player1Name,
        Player1Mobile:        e.Player1Mobile,
        Player1UserId:        e.Player1UserId,
        Player2Name:          e.Player2Name,
        Player2Mobile:        e.Player2Mobile,
        Player2UserId:        e.Player2UserId,
        TeamLabel:            e.TeamLabel,
        Seed:                 e.Seed,
        Status:               e.Status,
        CreatedAt:            e.CreatedAt);

}
