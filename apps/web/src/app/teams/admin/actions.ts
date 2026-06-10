"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export interface ActionResult { ok: boolean; message?: string; }

export async function setTeamPaymentAction(
  teamId: string,
  paid: boolean,
  paidTo: string | null,
): Promise<ActionResult> {
  const res = await api.patch(`/api/teams/${teamId}/payment`, { paid, paidTo });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/teams/admin");
  return { ok: true };
}

export type TeamStatus = "Active" | "Withdrawn" | "Waitlist";

export async function setTeamStatusAction(
  teamId: string,
  status: TeamStatus,
  comment: string | null,
): Promise<ActionResult> {
  const res = await api.patch(`/api/teams/${teamId}/status`, { status, comment });
  if (!res.ok) return { ok: false, message: res.message };
  // Admin list re-renders; public listing also reflects the change.
  revalidatePath("/teams/admin");
  revalidatePath("/teams/by-game", "page");   // catches any sport slug
  return { ok: true };
}
