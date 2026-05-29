import "server-only";
import { cache } from "react";
import { api } from "./api";

export type CategoryFormat = "Singles" | "MensDoubles" | "WomensDoubles" | "MixedDoubles";

export const FORMAT_LABEL: Record<CategoryFormat, string> = {
  Singles:       "Singles",
  MensDoubles:   "Men's Doubles",
  WomensDoubles: "Women's Doubles",
  MixedDoubles:  "Mixed Doubles",
};

export type TournamentStatus = "Draft" | "Upcoming" | "Open" | "InProgress" | "Completed";

export interface TournamentContactDto {
  name:         string;
  phoneDisplay: string;
  phoneE164:    string;
}

export interface TournamentCategoryDto {
  id:               string;
  name:             string;
  format:           CategoryFormat;
  playersPerEntry:  number;
  minEntries:       number;
  maxEntries:       number;
  entryFeeRupees:   number;
  registrationOpen: boolean;
}

export interface TournamentSummaryDto {
  id:                    string;
  slug:                  string;
  name:                  string;
  gameId:                string;
  gameName:              string;
  venue?:                string;
  startsOn?:             string;
  endsOn?:               string;
  registrationDeadline?: string;
  bannerImageUrl?:       string;
  entryFeeRupees:        number;
  registrationOpen:      boolean;
  isPublished:           boolean;
  status:                TournamentStatus;
  categoryCount:         number;
  categories:            TournamentCategoryDto[];
}

export interface TournamentDetailDto extends Omit<TournamentSummaryDto, "categoryCount"> {
  tagline?:        string;
  description?:    string;
  whatsAppGroupUrl?: string;
  contacts:        TournamentContactDto[];
}

// ── Public fetchers ──────────────────────────────────────────────────────
export const listPublishedTournaments = cache(async (): Promise<TournamentSummaryDto[]> => {
  const res = await api.get<TournamentSummaryDto[]>("/api/tournaments");
  return res.ok ? res.data : [];
});

export const getTournamentBySlug = cache(async (slug: string): Promise<TournamentDetailDto | null> => {
  const res = await api.get<TournamentDetailDto>(`/api/tournaments/${encodeURIComponent(slug)}`);
  return res.ok ? res.data : null;
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
