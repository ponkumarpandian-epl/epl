import "server-only";
import { api } from "./api";

export type BackendSport = "Cricket" | "Badminton" | "Volleyball";

export interface CaptainTeam {
  id:                string;
  sport:             BackendSport;
  name:              string;
  apartmentName:     string;
  seasonName:        string | null;
  activeMemberCount: number;
  maxRosterSize:     number;
}

export interface TeamMember {
  id:             string;
  userId:         string | null;
  fullName:       string;
  avatarUrl:      string | null;
  phoneMasked:    string;
  isCaptain:      boolean;
  shirtNumber:    string | null;
  position:       string | null;
  addedAt:        string;
  isPlaceholder:  boolean;
  needsAttention: boolean;
}

export interface TeamRoster {
  teamId:        string;
  sport:         BackendSport;
  name:          string;
  apartmentName: string;
  seasonName:    string | null;
  captainUserId: string | null;
  maxRosterSize: number;
  members:       TeamMember[];
}

export interface UserSearchResult {
  id:          string;
  fullName:    string;
  phoneMasked: string;
  avatarUrl:   string | null;
}

export interface MyTeam {
  membershipId:  string;
  teamId:        string;
  sport:         BackendSport;
  name:          string;
  apartmentName: string;
  seasonName:    string | null;
  captainName:   string;
  isCaptain:     boolean;
  shirtNumber:   string | null;
  position:      string | null;
}

export interface RosterChange {
  userId:    string;
  fullName:  string;
  isCaptain: boolean;
  action:    "added" | "removed";
  at:        string;
}

/** Teams the signed-in user captains. Empty array on any error (page shows empty state). */
export async function getCaptainTeams(): Promise<CaptainTeam[]> {
  const res = await api.get<CaptainTeam[]>("/api/captain/teams");
  return res.ok ? res.data : [];
}

/** One team's roster (captain/admin only). null when missing or not authorized. */
export async function getTeamRoster(teamId: string): Promise<TeamRoster | null> {
  const res = await api.get<TeamRoster>(`/api/teams/${teamId}/members`);
  return res.ok ? res.data : null;
}

export async function getRosterChanges(teamId: string): Promise<RosterChange[]> {
  const res = await api.get<RosterChange[]>(`/api/teams/${teamId}/roster-changes?limit=8`);
  return res.ok ? res.data : [];
}

/** Teams the signed-in user is an active member of. */
export async function getMyTeams(): Promise<MyTeam[]> {
  const res = await api.get<MyTeam[]>("/api/profile/me/teams");
  return res.ok ? res.data : [];
}

export interface PendingLink {
  membershipId:  string;
  teamId:        string;
  sport:         BackendSport;
  teamName:      string;
  apartmentName: string;
  seasonName:    string | null;
}

/** Teams the signed-in user was auto-linked to and hasn't yet acknowledged. */
export async function getPendingLinks(): Promise<PendingLink[]> {
  const res = await api.get<PendingLink[]>("/api/profile/me/pending-links");
  return res.ok ? res.data : [];
}
