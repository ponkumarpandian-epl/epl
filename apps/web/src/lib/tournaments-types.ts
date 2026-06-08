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
  /** Non-withdrawn entries (Pending + Confirmed). */
  totalEntries:     number;
  /** Subset of totalEntries that are status = Confirmed. */
  confirmedEntries: number;
}

export type EntryStatus = "Pending" | "Confirmed" | "Withdrawn";

/** Public view of one entry (no contact info). */
export interface TournamentEntryDto {
  id:                   string;
  tournamentCategoryId: string;
  player1Name:          string;
  player2Name?:         string;
  teamLabel?:           string;
  seed?:                number;
  status:               EntryStatus;
  createdAt:            string;
}

/** Admin view — includes mobile numbers + user-id references. */
export interface AdminTournamentEntryDto extends TournamentEntryDto {
  player1Mobile:        string;
  player1UserId?:       string;
  player2Mobile?:       string;
  player2UserId?:       string;
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
