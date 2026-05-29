"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { CategoryFormat } from "@/lib/tournaments";

const VALID_FORMATS: CategoryFormat[] = ["Singles", "MensDoubles", "WomensDoubles", "MixedDoubles"];

export async function togglePublishAction(id: string, publish: boolean) {
  await api.post(`/api/tournaments/admin/${id}/publish`, { publish });
  revalidatePath(`/admin/tournaments/${id}`);
  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
}

export async function toggleRegistrationAction(id: string, open: boolean) {
  await api.post(`/api/tournaments/admin/${id}/registration`, { open });
  revalidatePath(`/admin/tournaments/${id}`);
  revalidatePath("/admin/tournaments");
}

export interface AddCategoryState {
  fieldErrors?: Record<string, string>;
  topError?:    string;
  values?:      { name?: string; format?: string; min?: string; max?: string; fee?: string };
}

export async function addCategoryAction(
  tournamentId: string,
  _prev: AddCategoryState | undefined,
  formData: FormData,
): Promise<AddCategoryState> {
  const name   = String(formData.get("name")   ?? "").trim();
  const format = String(formData.get("format") ?? "").trim() as CategoryFormat;
  const min    = Number(formData.get("min")    ?? NaN);
  const max    = Number(formData.get("max")    ?? NaN);
  const fee    = Number(formData.get("fee")    ?? 0);
  const open   = formData.get("regOpen") === "on";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2)                          fieldErrors.name   = "Name is required.";
  if (!VALID_FORMATS.includes(format))          fieldErrors.format = "Pick a format.";
  if (!Number.isFinite(min) || min < 2)         fieldErrors.min    = "Minimum entries must be ≥ 2.";
  if (!Number.isFinite(max) || max < min)       fieldErrors.max    = "Maximum must be ≥ minimum.";
  if (!Number.isFinite(fee) || fee < 0)         fieldErrors.fee    = "Fee must be 0 or more.";

  const values = { name, format, min: String(min), max: String(max), fee: String(fee) };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const res = await api.post(`/api/tournaments/admin/${tournamentId}/categories`, {
    id: null,
    name,
    format,
    minEntries: min,
    maxEntries: max,
    entryFeeRupees: fee,
    registrationOpen: open,
  });

  if (!res.ok) {
    if (res.code === "duplicate_format") return { fieldErrors: { format: res.message }, values };
    return { topError: res.message, values };
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  return {};   // success — server re-renders the panel with the new category
}

export async function deleteCategoryAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId   = String(formData.get("categoryId")   ?? "");
  if (!tournamentId || !categoryId) return;
  await api.delete(`/api/tournaments/admin/${tournamentId}/categories/${categoryId}`);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
}

export async function togglePublishFormAction(formData: FormData) {
  const id      = String(formData.get("id") ?? "");
  const publish = formData.get("publish") === "true";
  if (!id) return;
  await togglePublishAction(id, publish);
}

export async function toggleRegistrationFormAction(formData: FormData) {
  const id   = String(formData.get("id") ?? "");
  const open = formData.get("open") === "true";
  if (!id) return;
  await toggleRegistrationAction(id, open);
}

export async function deleteTournamentRedirect(id: string) {
  // Not exposed in T-1 — placeholder for the admin "delete tournament" iteration.
  // For now route admins back to the list.
  redirect("/admin/tournaments");
  // unreachable, suppress unused-id warning
  void id;
}
