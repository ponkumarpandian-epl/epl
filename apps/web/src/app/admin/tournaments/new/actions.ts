"use server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { CategoryFormat } from "@/lib/tournaments";

export interface NewTournamentState {
  values?:      Record<string, string>;
  fieldErrors?: Record<string, string>;
  topError?:    string;
}

const slugRe = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const VALID_FORMATS: CategoryFormat[] = ["Singles", "MensDoubles", "WomensDoubles", "MixedDoubles"];

interface CategoryInput {
  name:           string;
  format:         CategoryFormat;
  minEntries:     number;
  maxEntries:     number;
  entryFeeRupees: number;
}

function parseCategories(formData: FormData): { ok: CategoryInput[]; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const cats: CategoryInput[] = [];
  const seen = new Set<CategoryFormat>();

  // Categories are encoded as cat-0-name, cat-0-format, etc. Read up to a hard cap of 8.
  for (let i = 0; i < 8; i++) {
    const name   = String(formData.get(`cat-${i}-name`)   ?? "").trim();
    const format = String(formData.get(`cat-${i}-format`) ?? "").trim() as CategoryFormat;
    if (!name && !format) continue;     // skip empty rows

    if (!VALID_FORMATS.includes(format)) {
      errors[`cat-${i}-format`] = "Pick a format.";
      continue;
    }
    if (seen.has(format)) {
      errors[`cat-${i}-format`] = "Format already used in another category above.";
      continue;
    }
    seen.add(format);

    const min  = Number(formData.get(`cat-${i}-min`)  ?? NaN);
    const max  = Number(formData.get(`cat-${i}-max`)  ?? NaN);
    const fee  = Number(formData.get(`cat-${i}-fee`)  ?? 0);

    if (!Number.isFinite(min) || min < 2) errors[`cat-${i}-min`] = "Minimum entries must be ≥ 2.";
    if (!Number.isFinite(max) || max < min) errors[`cat-${i}-max`] = "Maximum must be ≥ minimum.";
    if (!Number.isFinite(fee) || fee < 0) errors[`cat-${i}-fee`] = "Fee must be 0 or more.";

    cats.push({ name: name || formatLabel(format), format, minEntries: min, maxEntries: max, entryFeeRupees: fee });
  }

  return { ok: cats, errors };
}

function formatLabel(f: CategoryFormat): string {
  return f === "Singles"       ? "Singles"
       : f === "MensDoubles"   ? "Men's Doubles"
       : f === "WomensDoubles" ? "Women's Doubles"
       :                         "Mixed Doubles";
}

export async function createTournamentAction(
  _prev: NewTournamentState | undefined,
  formData: FormData,
): Promise<NewTournamentState> {
  const name        = String(formData.get("name")        ?? "").trim();
  const slug        = String(formData.get("slug")        ?? "").trim().toLowerCase();
  const gameId      = String(formData.get("gameId")      ?? "").trim();
  const tagline     = String(formData.get("tagline")     ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const venue       = String(formData.get("venue")       ?? "").trim();
  const startsOn    = String(formData.get("startsOn")    ?? "").trim();
  const endsOn      = String(formData.get("endsOn")      ?? "").trim();
  const deadline    = String(formData.get("deadline")    ?? "").trim();
  const banner      = String(formData.get("banner")      ?? "").trim();
  const whatsApp    = String(formData.get("whatsApp")    ?? "").trim();
  const fee         = Number(formData.get("fee")         ?? 0);
  const open        = formData.get("regOpen") === "on";
  const publish     = formData.get("publish") === "on";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 3)                         fieldErrors.name   = "Name must be at least 3 characters.";
  if (!slug || !slugRe.test(slug))             fieldErrors.slug   = "Lowercase letters, digits, single dashes only.";
  if (!gameId)                                 fieldErrors.gameId = "Pick a sport.";
  if (!Number.isFinite(fee) || fee < 0)        fieldErrors.fee    = "Fee must be 0 or more.";
  if (startsOn && endsOn && endsOn < startsOn) fieldErrors.endsOn = "End date must be on or after the start date.";
  if (deadline && startsOn && deadline > startsOn) fieldErrors.deadline = "Deadline must be on or before the start date.";

  const { ok: cats, errors: catErrs } = parseCategories(formData);
  Object.assign(fieldErrors, catErrs);

  const values: Record<string, string> = {
    name, slug, gameId, tagline, description, venue, startsOn, endsOn, deadline, banner, whatsApp,
    fee: String(fee),
    regOpen: open ? "on" : "",
    publish: publish ? "on" : "",
  };
  // Preserve category inputs verbatim so the form re-renders with what the user typed.
  for (let i = 0; i < 8; i++) {
    const n = formData.get(`cat-${i}-name`);   if (n !== null) values[`cat-${i}-name`]   = String(n);
    const f = formData.get(`cat-${i}-format`); if (f !== null) values[`cat-${i}-format`] = String(f);
    const mn = formData.get(`cat-${i}-min`);   if (mn !== null) values[`cat-${i}-min`]    = String(mn);
    const mx = formData.get(`cat-${i}-max`);   if (mx !== null) values[`cat-${i}-max`]    = String(mx);
    const fe = formData.get(`cat-${i}-fee`);   if (fe !== null) values[`cat-${i}-fee`]    = String(fe);
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const payload = {
    name,
    slug,
    gameId,
    tagline:              tagline      || null,
    description:          description  || null,
    venue:                venue        || null,
    startsOn:             startsOn  ? new Date(startsOn).toISOString() : null,
    endsOn:               endsOn    ? new Date(endsOn).toISOString()   : null,
    registrationDeadline: deadline  ? new Date(deadline).toISOString() : null,
    bannerImageUrl:       banner       || null,
    whatsAppGroupUrl:     whatsApp     || null,
    entryFeeRupees:       fee,
    registrationOpen:     open,
    publish,
    contacts:             null,
    categories:           cats.map((c) => ({ id: null, ...c, registrationOpen: open })),
  };

  const res = await api.post<{ id: string }>("/api/tournaments/admin", payload);
  if (!res.ok) {
    if (res.code === "duplicate_slug") return { fieldErrors: { slug: res.message }, values };
    if (res.code === "duplicate_format") return { topError: res.message, values };
    return { topError: res.message, values };
  }

  redirect(`/admin/tournaments/${res.data.id}`);
}
