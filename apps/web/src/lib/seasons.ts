import "server-only";
import { cache } from "react";
import { api } from "./api";

export type SportName = "Cricket" | "Badminton" | "Volleyball";

export interface ContactDto {
  name:         string;
  phoneDisplay: string;
  phoneE164:    string;
}

export interface SeasonGameDto {
  id:               string;
  gameId:           string;
  sport:            SportName;
  slug:             string;     // "cricket" | "badminton" | "volleyball"
  name:             string;     // "Cricket"
  description?:     string;
  venue?:           string;
  categories?:      string;
  entryFeeRupees:   number;
  startsOn?:        string;     // ISO
  endsOn?:          string;
  whatsAppGroupUrl?: string;
  cardImageUrl?:    string;
  registrationOpen: boolean;
  contacts:         ContactDto[];
}

export interface SeasonDto {
  id:               string;
  name:             string;
  year:             number;
  slug:             string;
  tagline?:         string;
  startsOn?:        string;
  endsOn?:          string;
  isActive:         boolean;
  registrationOpen: boolean;
  games:            SeasonGameDto[];
}

// Wrapped in React cache() so multiple Server Components in one render share
// a single API call. The api.ts fetch uses `cache: "no-store"` so this is the
// only layer that dedupes per request.
export const getCurrentSeason = cache(async (): Promise<SeasonDto | null> => {
  const res = await api.get<SeasonDto>("/api/seasons/current");
  return res.ok ? res.data : null;
});

export interface GameMasterDto {
  id:               string;
  name:             string;
  slug:             string;
  kind:             SportName;
  description?:     string;
  whatsAppGroupUrl?: string;
  isActive:         boolean;
}

export const listAllSeasons = cache(async (): Promise<SeasonDto[]> => {
  const res = await api.get<SeasonDto[]>("/api/seasons");
  return res.ok ? res.data : [];
});

export const listAllGames = cache(async (): Promise<GameMasterDto[]> => {
  const res = await api.get<GameMasterDto[]>("/api/seasons/games");
  return res.ok ? res.data : [];
});

export const getSeasonById = cache(async (id: string): Promise<SeasonDto | null> => {
  const res = await api.get<SeasonDto>(`/api/seasons/${id}`);
  return res.ok ? res.data : null;
});

// ── Hero-ticker stats ─────────────────────────────────────────────────────
export interface SportRegistrationStat {
  seasonGameId:     string;
  sport:            SportName;
  slug:             string;        // "cricket" | "badminton" | "volleyball"
  name:             string;
  teamCount:        number;
  registrationOpen: boolean;
}
export interface RegistrationStats {
  seasonId:               string;
  seasonName:             string;
  masterRegistrationOpen: boolean;
  totalTeams:             number;
  sports:                 SportRegistrationStat[];
}

export const getCurrentSeasonStats = cache(async (): Promise<RegistrationStats | null> => {
  const res = await api.get<RegistrationStats>("/api/seasons/current/registration-stats");
  return res.ok ? res.data : null;
});
