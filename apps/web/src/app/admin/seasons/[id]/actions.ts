"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export interface ActionResult { ok: boolean; message?: string; }

export async function toggleRegistrationAction(seasonId: string, open: boolean): Promise<ActionResult> {
  const res = await api.post(`/api/seasons/${seasonId}/registration`, { open });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/", "layout");                    // home page reflects new state
  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath("/admin/seasons");
  return { ok: true };
}

export async function activateSeasonAction(seasonId: string): Promise<ActionResult> {
  const res = await api.post(`/api/seasons/${seasonId}/activate`, {});
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/", "layout");
  revalidatePath("/admin/seasons");
  revalidatePath(`/admin/seasons/${seasonId}`);
  return { ok: true };
}

export interface AddGameInput {
  gameId:           string;
  venue?:           string;
  categories?:      string;
  entryFeeRupees:   number;
  startsOn?:        string;
  endsOn?:          string;
  whatsAppGroupUrl?: string;
  cardImageUrl?:    string;
}

export async function addGameToSeasonAction(seasonId: string, input: AddGameInput): Promise<ActionResult> {
  const payload = {
    gameId:           input.gameId,
    venue:            input.venue ?? null,
    categories:       input.categories ?? null,
    entryFeeRupees:   input.entryFeeRupees,
    startsOn:         input.startsOn ? new Date(input.startsOn).toISOString() : null,
    endsOn:           input.endsOn   ? new Date(input.endsOn).toISOString()   : null,
    whatsAppGroupUrl: input.whatsAppGroupUrl ?? null,
    cardImageUrl:     input.cardImageUrl ?? null,
    contacts:         [], // contacts editable later in a dedicated UI; backend accepts empty
  };

  const res = await api.post(`/api/seasons/${seasonId}/games`, payload);
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath("/", "layout");
  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath("/admin/seasons");
  return { ok: true };
}
