import "server-only";
import { cache } from "react";
import { api, type ApiResult } from "./api";
import type {
  TournamentSummaryDto,
  TournamentDetailDto,
  TournamentEntryDto,
  AdminTournamentEntryDto,
  EntryStatus,
} from "./tournaments-types";

export * from "./tournaments-types";

// ── Public fetchers ──────────────────────────────────────────────────────
export const listPublishedTournaments = cache(async (): Promise<TournamentSummaryDto[]> => {
  const res = await api.get<TournamentSummaryDto[]>("/api/tournaments");
  return res.ok ? res.data : [];
});

export const getTournamentBySlug = cache(async (slug: string): Promise<TournamentDetailDto | null> => {
  const res = await api.get<TournamentDetailDto>(`/api/tournaments/${encodeURIComponent(slug)}`);
  return res.ok ? res.data : null;
});

export const listCategoryEntries = cache(async (
  slug: string,
  categoryId: string,
): Promise<TournamentEntryDto[]> => {
  const res = await api.get<TournamentEntryDto[]>(
    `/api/tournaments/${encodeURIComponent(slug)}/categories/${encodeURIComponent(categoryId)}/entries`,
  );
  return res.ok ? res.data : [];
});

// ── Admin fetchers ───────────────────────────────────────────────────────
export const listAllTournaments = cache(async (): Promise<TournamentSummaryDto[]> => {
  const res = await api.get<TournamentSummaryDto[]>("/api/tournaments/admin");
  return res.ok ? res.data : [];
});

export const getTournamentById = cache(async (id: string): Promise<TournamentDetailDto | null> => {
  const res = await api.get<TournamentDetailDto>(`/api/tournaments/admin/${id}`);
  return res.ok ? res.data : null;
});

export const listAdminCategoryEntries = cache(async (
  categoryId: string,
): Promise<AdminTournamentEntryDto[]> => {
  const res = await api.get<AdminTournamentEntryDto[]>(
    `/api/tournaments/admin/categories/${encodeURIComponent(categoryId)}/entries`,
  );
  return res.ok ? res.data : [];
});

// ── Mutations ────────────────────────────────────────────────────────────
// Server-action callers go through these — they forward cookies + correlation-id via api.ts.

export interface RegisterEntryPayload {
  player1Name:   string;
  player1Mobile: string;
  player2Name?:  string;
  player2Mobile?:string;
  teamLabel?:    string;
}

export function registerEntry(
  slug: string,
  categoryId: string,
  payload: RegisterEntryPayload,
): Promise<ApiResult<TournamentEntryDto>> {
  return api.post<TournamentEntryDto>(
    `/api/tournaments/${encodeURIComponent(slug)}/categories/${encodeURIComponent(categoryId)}/entries`,
    payload,
  );
}

export function updateEntrySeed(
  entryId: string,
  seed: number | null,
): Promise<ApiResult<AdminTournamentEntryDto>> {
  return api.put<AdminTournamentEntryDto>(
    `/api/tournaments/admin/entries/${encodeURIComponent(entryId)}/seed`,
    { seed },
  );
}

export function updateEntryStatus(
  entryId: string,
  status: EntryStatus,
): Promise<ApiResult<AdminTournamentEntryDto>> {
  return api.put<AdminTournamentEntryDto>(
    `/api/tournaments/admin/entries/${encodeURIComponent(entryId)}/status`,
    { status },
  );
}
