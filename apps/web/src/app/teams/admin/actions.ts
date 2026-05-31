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
