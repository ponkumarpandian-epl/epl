"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { TeamMember, UserSearchResult } from "@/lib/captain";

export interface ActionResult<T = void> { ok: boolean; message?: string; data?: T; }

/** Debounced user search from the captain's "add player" box. */
export async function searchUsersAction(q: string): Promise<ActionResult<UserSearchResult[]>> {
  const term = q.trim();
  if (term.length < 2) return { ok: true, data: [] };
  const res = await api.get<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(term)}&limit=10`);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, data: res.data };
}

export async function addMemberAction(
  teamId: string,
  userId: string,
  shirtNumber: string | null,
  position: string | null,
): Promise<ActionResult<TeamMember>> {
  const res = await api.post<TeamMember>(`/api/teams/${teamId}/members`, { userId, shirtNumber, position });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/captain/teams/${teamId}`);
  return { ok: true, data: res.data };
}

export async function removeMemberAction(teamId: string, memberId: string): Promise<ActionResult> {
  const res = await api.del(`/api/teams/${teamId}/members/${memberId}`);
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/captain/teams/${teamId}`);
  return { ok: true };
}

export async function addPlaceholderAction(
  teamId: string,
  name: string,
  mobile: string,
  shirtNumber: string | null,
  position: string | null,
): Promise<ActionResult<TeamMember>> {
  const res = await api.post<TeamMember>(`/api/teams/${teamId}/members`,
    { placeholderName: name, placeholderMobile: mobile, shirtNumber, position });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/captain/teams/${teamId}`);
  return { ok: true, data: res.data };
}

/** Returns the registered user if this mobile already has an account, else null. */
export async function matchMobileAction(mobile: string): Promise<ActionResult<UserSearchResult | null>> {
  const term = mobile.trim();
  if (term.length < 10) return { ok: true, data: null };
  const res = await api.get<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(term)}&limit=1`);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, data: res.data[0] ?? null };
}

export async function transferCaptaincyAction(teamId: string, newCaptainUserId: string): Promise<ActionResult> {
  const res = await api.put(`/api/teams/${teamId}/captain`, { newCaptainUserId });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/captain/teams/${teamId}`);
  revalidatePath("/captain");
  return { ok: true };
}
