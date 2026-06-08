"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { CategoryFormat, EntryStatus } from "@/lib/tournaments";
import { updateEntrySeed, updateEntryStatus, listAdminCategoryEntries } from "@/lib/tournaments";
import {
  createBracket,
  seedBracket,
  publishBracket,
  getAdminBracketByParent,
  type SeedItem,
} from "@/lib/brackets";

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

// ── Entry mutations (T-2) ─────────────────────────────────────────────────

const VALID_STATUS: EntryStatus[] = ["Pending", "Confirmed", "Withdrawn"];

export async function setEntrySeedAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const entryId      = String(formData.get("entryId")      ?? "");
  const seedRaw      = String(formData.get("seed")         ?? "").trim();
  if (!tournamentId || !entryId) return;

  // Empty string clears the seed.
  const seed = seedRaw === "" ? null : Number(seedRaw);
  if (seed !== null && (!Number.isFinite(seed) || seed < 1 || seed > 256)) return;

  await updateEntrySeed(entryId, seed);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
}

export async function setEntryStatusAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const entryId      = String(formData.get("entryId")      ?? "");
  const status       = String(formData.get("status")       ?? "") as EntryStatus;
  if (!tournamentId || !entryId || !VALID_STATUS.includes(status)) return;

  await updateEntryStatus(entryId, status);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  // Public detail page also shows entries — invalidate the cache so it picks up the new state.
  revalidatePath("/tournaments");
}

// ── Bracket mutations (T-3) ───────────────────────────────────────────────

/** Creates a SingleElimination bracket for the given category. Auto-seeds from confirmed entries. */
export async function createBracketAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const categoryId   = String(formData.get("categoryId")   ?? "");
  if (!tournamentId || !categoryId) return;

  await createBracket("TournamentCategory", categoryId, "SingleElimination");
  revalidatePath(`/admin/tournaments/${tournamentId}`);
}

/**
 * Wipes + rebuilds the bracket using whichever entries are currently Confirmed.
 * Refused server-side if any match has started — caller surfaces the error.
 */
export async function regenerateBracketAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const bracketId    = String(formData.get("bracketId")    ?? "");
  const categoryId   = String(formData.get("categoryId")   ?? "");
  if (!tournamentId || !bracketId || !categoryId) return;

  const entries = await listAdminCategoryEntries(categoryId);
  const seeds: SeedItem[] = entries
    .filter((e) => e.status === "Confirmed")
    .sort((a, b) => {
      const sa = a.seed ?? Number.MAX_SAFE_INTEGER;
      const sb = b.seed ?? Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .map((e, i) => ({
      sourceEntryId: e.id,
      displayName:   e.player2Name ? `${e.player1Name} / ${e.player2Name}` : e.player1Name,
      seed:          e.seed ?? i + 1,
      isBye:         false,
    }));

  await seedBracket(bracketId, seeds);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
}

/** Save manually-edited seeds. Form fields are named `seed-<participantId>`. */
export async function reseedBracketAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const bracketId    = String(formData.get("bracketId")    ?? "");
  const categoryId   = String(formData.get("categoryId")   ?? "");
  if (!tournamentId || !bracketId) return;

  // Reload the bracket so we know which participants exist + their source-entry / display name.
  const bracket = await getAdminBracketByParent("TournamentCategory", categoryId);
  if (!bracket) return;

  const seeds: SeedItem[] = bracket.participants
    .filter((p) => !p.isBye)
    .map((p) => {
      const raw = String(formData.get(`seed-${p.id}`) ?? "").trim();
      const seed = raw === "" ? undefined : Number(raw);
      return {
        sourceEntryId: p.sourceEntryId,
        displayName:   p.displayName,
        seed:          Number.isFinite(seed) ? seed : undefined,
        isBye:         false,
      } as SeedItem;
    });

  await seedBracket(bracketId, seeds);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
}

export async function publishBracketAction(formData: FormData) {
  const tournamentId = String(formData.get("tournamentId") ?? "");
  const bracketId    = String(formData.get("bracketId")    ?? "");
  const publish      = formData.get("publish") === "true";
  if (!tournamentId || !bracketId) return;

  await publishBracket(bracketId, publish);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
}
