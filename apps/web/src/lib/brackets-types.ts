export type DrawFormat = "SingleElimination" | "RoundRobin" | "GroupKnockout";

export type MatchStatus = "Pending" | "Scheduled" | "InProgress" | "Complete" | "Walkover";

export interface BracketParticipantDto {
  id:             string;
  displayName:    string;
  seed?:          number;
  isBye:          boolean;
  sourceEntryId?: string;
}

export interface BracketMatchDto {
  id:                   string;
  roundId:              string;
  slotIndex:            number;
  participantAId?:      string;
  participantBId?:      string;
  winnerParticipantId?: string;
  status:               MatchStatus;
  scheduledAt?:         string;
  court?:               string;
  nextMatchId?:         string;
  rulesBestOf:          number;
  rulesPointsToWin:     number;
  rulesWinByMargin:     number;
  rulesPointCap?:       number;
}

export interface BracketRoundDto {
  id:          string;
  orderIndex:  number;
  name:        string;
  groupLabel?: string;
  matches:     BracketMatchDto[];
}

export interface BracketViewDto {
  id:                 string;
  parentType:         string;
  parentId:           string;
  format:             DrawFormat;
  isPublished:        boolean;
  defaultBestOf:      number;
  defaultPointsToWin: number;
  defaultWinByMargin: number;
  defaultPointCap?:   number;
  participants:       BracketParticipantDto[];
  rounds:             BracketRoundDto[];
}

export interface SeedItem {
  participantId?: string;
  sourceEntryId?: string;
  displayName:    string;
  seed?:          number;
  isBye:          boolean;
}
