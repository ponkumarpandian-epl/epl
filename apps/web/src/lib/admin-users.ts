import "server-only";
import { api } from "./api";
import type { BackendSport } from "./captain";

export interface AdminUser {
  id:          string;
  fullName:    string;
  emailMasked: string;
  phoneMasked: string;
  roles:       string[];
}

export interface CaptainedTeam {
  teamId:      string;
  teamName:    string;
  sport:       BackendSport;
  seasonLabel: string | null;
}

export interface AdminUserDetail extends AdminUser {
  captainedTeams: CaptainedTeam[];
}

export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; }

export const ALL_ROLES = ["Admin", "Umpire", "Player"] as const;
export type AppRole = (typeof ALL_ROLES)[number];

export async function listUsers(
  q: string, role: string, page: number, pageSize = 20,
): Promise<Paged<AdminUser> | null> {
  const qs = new URLSearchParams();
  if (q)    qs.set("q", q);
  if (role) qs.set("role", role);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  const res = await api.get<Paged<AdminUser>>(`/api/admin/users?${qs}`);
  return res.ok ? res.data : null;
}

export async function getUser(userId: string): Promise<AdminUserDetail | null> {
  const res = await api.get<AdminUserDetail>(`/api/admin/users/${userId}`);
  return res.ok ? res.data : null;
}
