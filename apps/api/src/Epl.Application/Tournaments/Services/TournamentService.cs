using Epl.Application.Tournaments.Dtos;
using Epl.Domain.Abstractions;
using Epl.Domain.Common;
using Epl.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Epl.Application.Tournaments.Services;

public class TournamentService(IUnitOfWork uow, ILogger<TournamentService> log) : ITournamentService
{
    // ── Public ─────────────────────────────────────────────────────────────
    public async Task<IReadOnlyList<TournamentSummaryDto>> ListPublishedAsync(CancellationToken ct = default)
    {
        var rows = await uow.Tournaments.ListPublishedAsync(ct);
        var list = new List<TournamentSummaryDto>(rows.Count);
        foreach (var t in rows)
        {
            var counts = await uow.TournamentEntries.CountByTournamentAsync(t.Id, ct);
            list.Add(ToSummary(t, counts));
        }
        return list;
    }

    public async Task<TournamentDetailDto?> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        var t = await uow.Tournaments.GetBySlugAsync(slug, ct);
        if (t is null || !t.IsPublished) return null;
        var counts = await uow.TournamentEntries.CountByTournamentAsync(t.Id, ct);
        return ToDetail(t, counts);
    }

    // ── Admin ──────────────────────────────────────────────────────────────
    public async Task<IReadOnlyList<TournamentSummaryDto>> ListAllAsync(CancellationToken ct = default)
    {
        var rows = await uow.Tournaments.ListAllWithCategoriesAsync(ct);
        var list = new List<TournamentSummaryDto>(rows.Count);
        foreach (var t in rows)
        {
            var counts = await uow.TournamentEntries.CountByTournamentAsync(t.Id, ct);
            list.Add(ToSummary(t, counts));
        }
        return list;
    }

    public async Task<TournamentDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var t = await uow.Tournaments.GetWithCategoriesAsync(id, ct);
        if (t is null) return null;
        var counts = await uow.TournamentEntries.CountByTournamentAsync(t.Id, ct);
        return ToDetail(t, counts);
    }

    public async Task<Result<TournamentDetailDto>> CreateAsync(CreateTournamentRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Slug))
            return Result<TournamentDetailDto>.Fail("invalid_input", "Name and Slug are required.");

        var slug = req.Slug.Trim().ToLowerInvariant();
        if (await uow.Tournaments.AnyAsync(x => x.Slug == slug, ct))
            return Result<TournamentDetailDto>.Fail("duplicate_slug", $"A tournament with slug \"{slug}\" already exists.");

        var game = await uow.Games.GetByIdAsync(req.GameId, ct);
        if (game is null)
            return Result<TournamentDetailDto>.Fail("game_not_found", "Game not found.");

        var tournament = new Tournament
        {
            Name                 = req.Name.Trim(),
            Slug                 = slug,
            GameId               = req.GameId,
            Tagline              = req.Tagline,
            Description          = req.Description,
            Venue                = req.Venue,
            StartsOn             = req.StartsOn,
            EndsOn               = req.EndsOn,
            RegistrationDeadline = req.RegistrationDeadline,
            BannerImageUrl       = req.BannerImageUrl,
            WhatsAppGroupUrl     = req.WhatsAppGroupUrl,
            EntryFeeRupees       = req.EntryFeeRupees,
            RegistrationOpen     = req.RegistrationOpen,
            IsPublished          = req.Publish,
            Contacts             = (req.Contacts ?? Array.Empty<TournamentContactDto>())
                                       .Select(c => new TournamentContact
                                       {
                                           Name         = c.Name,
                                           PhoneDisplay = c.PhoneDisplay,
                                           PhoneE164    = c.PhoneE164,
                                       }).ToList(),
        };

        // Inline categories from the form. Each category needs a unique Format per tournament —
        // duplicates are dropped silently (the form should prevent picking the same Format twice).
        var seen = new HashSet<CategoryFormat>();
        foreach (var c in req.Categories ?? Array.Empty<UpsertTournamentCategoryRequest>())
        {
            if (!seen.Add(c.Format)) continue;
            tournament.Categories.Add(new TournamentCategory
            {
                TournamentId     = tournament.Id,
                Name             = c.Name.Trim(),
                Format           = c.Format,
                PlayersPerEntry  = c.Format == CategoryFormat.Singles ? 1 : 2,
                MinEntries       = c.MinEntries,
                MaxEntries       = c.MaxEntries,
                EntryFeeRupees   = c.EntryFeeRupees,
                RegistrationOpen = c.RegistrationOpen,
            });
        }

        uow.Tournaments.Add(tournament);
        await uow.SaveChangesAsync(ct);
        log.LogInformation("Created tournament {TournamentId} ({Name}) published={Published}", tournament.Id, tournament.Name, tournament.IsPublished);

        var saved = await uow.Tournaments.GetWithCategoriesAsync(tournament.Id, ct);
        var counts = await uow.TournamentEntries.CountByTournamentAsync(tournament.Id, ct);
        return Result<TournamentDetailDto>.Ok(ToDetail(saved!, counts));
    }

    public async Task<Result<TournamentDetailDto>> UpdateAsync(Guid id, UpdateTournamentRequest req, CancellationToken ct = default)
    {
        var t = await uow.Tournaments.GetByIdAsync(id, ct);
        if (t is null) return Result<TournamentDetailDto>.Fail("tournament_not_found", "Tournament not found.");

        if (req.Name              is { } n)  t.Name                 = n.Trim();
        if (req.Tagline           is { } tg) t.Tagline              = tg;
        if (req.Description       is { } d)  t.Description          = d;
        if (req.Venue             is { } v)  t.Venue                = v;
        if (req.StartsOn          is { } s)  t.StartsOn             = s;
        if (req.EndsOn            is { } e)  t.EndsOn               = e;
        if (req.RegistrationDeadline is { } rd) t.RegistrationDeadline = rd;
        if (req.BannerImageUrl    is { } bi) t.BannerImageUrl       = bi;
        if (req.WhatsAppGroupUrl  is { } w)  t.WhatsAppGroupUrl     = w;
        if (req.EntryFeeRupees    is { } f)  t.EntryFeeRupees       = f;
        if (req.RegistrationOpen  is { } ro) t.RegistrationOpen     = ro;

        if (req.Contacts is not null)
        {
            t.Contacts = req.Contacts.Select(c => new TournamentContact
            {
                Name         = c.Name,
                PhoneDisplay = c.PhoneDisplay,
                PhoneE164    = c.PhoneE164,
            }).ToList();
        }

        await uow.SaveChangesAsync(ct);
        var refreshed = await uow.Tournaments.GetWithCategoriesAsync(id, ct);
        var counts    = await uow.TournamentEntries.CountByTournamentAsync(id, ct);
        return Result<TournamentDetailDto>.Ok(ToDetail(refreshed!, counts));
    }

    public async Task<Result<TournamentDetailDto>> PublishAsync(Guid id, bool publish, CancellationToken ct = default)
    {
        var t = await uow.Tournaments.GetByIdAsync(id, ct);
        if (t is null) return Result<TournamentDetailDto>.Fail("tournament_not_found", "Tournament not found.");

        t.IsPublished = publish;
        await uow.SaveChangesAsync(ct);
        log.LogInformation("Tournament {Id} published={Published}", id, publish);

        var refreshed = await uow.Tournaments.GetWithCategoriesAsync(id, ct);
        var counts    = await uow.TournamentEntries.CountByTournamentAsync(id, ct);
        return Result<TournamentDetailDto>.Ok(ToDetail(refreshed!, counts));
    }

    public async Task<Result<TournamentDetailDto>> SetRegistrationAsync(Guid id, bool open, CancellationToken ct = default)
    {
        var t = await uow.Tournaments.GetByIdAsync(id, ct);
        if (t is null) return Result<TournamentDetailDto>.Fail("tournament_not_found", "Tournament not found.");

        t.RegistrationOpen = open;
        await uow.SaveChangesAsync(ct);

        var refreshed = await uow.Tournaments.GetWithCategoriesAsync(id, ct);
        var counts    = await uow.TournamentEntries.CountByTournamentAsync(id, ct);
        return Result<TournamentDetailDto>.Ok(ToDetail(refreshed!, counts));
    }

    public async Task<Result<TournamentDetailDto>> UpsertCategoryAsync(Guid tournamentId, UpsertTournamentCategoryRequest req, CancellationToken ct = default)
    {
        var t = await uow.Tournaments.GetWithCategoriesAsync(tournamentId, ct);
        if (t is null) return Result<TournamentDetailDto>.Fail("tournament_not_found", "Tournament not found.");

        if (req.Id is { } existingId)
        {
            var existing = await uow.TournamentCategories.GetByIdAsync(existingId, ct);
            if (existing is null || existing.TournamentId != tournamentId)
                return Result<TournamentDetailDto>.Fail("category_not_found", "Category not found.");

            // Format change is allowed only if no other category in this tournament already has the new Format.
            if (existing.Format != req.Format &&
                t.Categories.Any(c => c.Id != existingId && c.Format == req.Format))
                return Result<TournamentDetailDto>.Fail("duplicate_format",
                    $"This tournament already has a \"{req.Format}\" category.");

            existing.Name             = req.Name.Trim();
            existing.Format           = req.Format;
            existing.PlayersPerEntry  = req.Format == CategoryFormat.Singles ? 1 : 2;
            existing.MinEntries       = req.MinEntries;
            existing.MaxEntries       = req.MaxEntries;
            existing.EntryFeeRupees   = req.EntryFeeRupees;
            existing.RegistrationOpen = req.RegistrationOpen;
        }
        else
        {
            if (t.Categories.Any(c => c.Format == req.Format))
                return Result<TournamentDetailDto>.Fail("duplicate_format",
                    $"This tournament already has a \"{req.Format}\" category.");

            uow.TournamentCategories.Add(new TournamentCategory
            {
                TournamentId     = tournamentId,
                Name             = req.Name.Trim(),
                Format           = req.Format,
                PlayersPerEntry  = req.Format == CategoryFormat.Singles ? 1 : 2,
                MinEntries       = req.MinEntries,
                MaxEntries       = req.MaxEntries,
                EntryFeeRupees   = req.EntryFeeRupees,
                RegistrationOpen = req.RegistrationOpen,
            });
        }

        await uow.SaveChangesAsync(ct);
        var refreshed = await uow.Tournaments.GetWithCategoriesAsync(tournamentId, ct);
        var counts    = await uow.TournamentEntries.CountByTournamentAsync(tournamentId, ct);
        return Result<TournamentDetailDto>.Ok(ToDetail(refreshed!, counts));
    }

    public async Task<Result<TournamentDetailDto>> DeleteCategoryAsync(Guid tournamentId, Guid categoryId, CancellationToken ct = default)
    {
        var cat = await uow.TournamentCategories.GetByIdAsync(categoryId, ct);
        if (cat is null || cat.TournamentId != tournamentId)
            return Result<TournamentDetailDto>.Fail("category_not_found", "Category not found.");

        uow.TournamentCategories.Remove(cat);
        await uow.SaveChangesAsync(ct);

        var refreshed = await uow.Tournaments.GetWithCategoriesAsync(tournamentId, ct);
        var counts    = await uow.TournamentEntries.CountByTournamentAsync(tournamentId, ct);
        return Result<TournamentDetailDto>.Ok(ToDetail(refreshed!, counts));
    }

    // ── Mappers ────────────────────────────────────────────────────────────
    private static TournamentCategoryDto MakeCategoryDto(
        TournamentCategory c,
        IReadOnlyDictionary<Guid, (int Total, int Confirmed)> counts)
    {
        var (total, confirmed) = counts.TryGetValue(c.Id, out var v) ? v : (0, 0);
        return new TournamentCategoryDto(
            Id:               c.Id,
            Name:             c.Name,
            Format:           c.Format,
            PlayersPerEntry:  c.PlayersPerEntry,
            MinEntries:       c.MinEntries,
            MaxEntries:       c.MaxEntries,
            EntryFeeRupees:   c.EntryFeeRupees,
            RegistrationOpen: c.RegistrationOpen,
            TotalEntries:     total,
            ConfirmedEntries: confirmed);
    }

    private static TournamentSummaryDto ToSummary(
        Tournament t,
        IReadOnlyDictionary<Guid, (int Total, int Confirmed)> counts)
    {
        var cats = t.Categories.OrderBy(c => c.Format)
            .Select(c => MakeCategoryDto(c, counts))
            .ToList();

        return new TournamentSummaryDto(
            Id:                   t.Id,
            Slug:                 t.Slug,
            Name:                 t.Name,
            GameId:               t.GameId,
            GameName:             t.Game?.Name ?? string.Empty,
            Venue:                t.Venue,
            StartsOn:             t.StartsOn,
            EndsOn:               t.EndsOn,
            RegistrationDeadline: t.RegistrationDeadline,
            BannerImageUrl:       t.BannerImageUrl,
            EntryFeeRupees:       t.EntryFeeRupees,
            RegistrationOpen:     t.RegistrationOpen,
            IsPublished:          t.IsPublished,
            Status:               ComputeStatus(t),
            CategoryCount:        cats.Count,
            Categories:           cats);
    }

    private static TournamentDetailDto ToDetail(
        Tournament t,
        IReadOnlyDictionary<Guid, (int Total, int Confirmed)> counts) => new(
            Id:                   t.Id,
            Slug:                 t.Slug,
            Name:                 t.Name,
            GameId:               t.GameId,
            GameName:             t.Game?.Name ?? string.Empty,
            Tagline:              t.Tagline,
            Description:          t.Description,
            Venue:                t.Venue,
            StartsOn:             t.StartsOn,
            EndsOn:               t.EndsOn,
            RegistrationDeadline: t.RegistrationDeadline,
            BannerImageUrl:       t.BannerImageUrl,
            WhatsAppGroupUrl:     t.WhatsAppGroupUrl,
            EntryFeeRupees:       t.EntryFeeRupees,
            RegistrationOpen:     t.RegistrationOpen,
            IsPublished:          t.IsPublished,
            Status:               ComputeStatus(t),
            Categories:           t.Categories.OrderBy(c => c.Format)
                                    .Select(c => MakeCategoryDto(c, counts))
                                    .ToList(),
            Contacts:             t.Contacts.Select(c => new TournamentContactDto(c.Name, c.PhoneDisplay, c.PhoneE164)).ToList());

    private static TournamentStatus ComputeStatus(Tournament t)
    {
        if (!t.IsPublished) return TournamentStatus.Draft;
        var now = DateTimeOffset.UtcNow;
        if (t.EndsOn is { } ends && ends < now) return TournamentStatus.Completed;
        if (t.StartsOn is { } starts && starts <= now) return TournamentStatus.InProgress;
        var deadlinePassed = t.RegistrationDeadline is { } rd && rd < now;
        if (t.RegistrationOpen && !deadlinePassed) return TournamentStatus.Open;
        return TournamentStatus.Upcoming;
    }
}
