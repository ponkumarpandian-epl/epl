"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export interface ActionResult { ok: boolean; message?: string; }

/** Leave a team you're on. Also the implicit "decline" for an unwanted add (plan/10 C6). */
export async function leaveTeamAction(membershipId: string): Promise<ActionResult> {
  const res = await api.post(`/api/team-members/${membershipId}/leave`);
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/profile");
  return { ok: true };
}

/** Acknowledge an auto-linked team membership (keeps the player on the team). */
export async function acknowledgeLinkAction(membershipId: string): Promise<ActionResult> {
  const res = await api.post(`/api/team-members/${membershipId}/acknowledge`, {});
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/profile");
  return { ok: true };
}
