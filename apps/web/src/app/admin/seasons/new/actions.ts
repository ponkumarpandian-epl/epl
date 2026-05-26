"use server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export interface NewSeasonState {
  values?:      Record<string, string>;
  fieldErrors?: Record<string, string>;
  topError?:    string;
}

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createSeasonAction(
  _prev: NewSeasonState | undefined,
  formData: FormData,
): Promise<NewSeasonState> {
  const name      = String(formData.get("name")      ?? "").trim();
  const year      = Number(formData.get("year")      ?? NaN);
  const slug      = String(formData.get("slug")      ?? "").trim().toLowerCase();
  const tagline   = String(formData.get("tagline")   ?? "").trim();
  const startsOn  = String(formData.get("startsOn")  ?? "").trim();
  const endsOn    = String(formData.get("endsOn")    ?? "").trim();
  const setActive = formData.get("setActive") === "on";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2)                     fieldErrors.name = "Name must be at least 2 characters.";
  if (!Number.isFinite(year) || year < 2025 || year > 2100) fieldErrors.year = "Pick a year between 2025 and 2100.";
  if (!slug || !slugRe.test(slug))         fieldErrors.slug = "Lowercase letters, numbers, and single dashes only.";
  if (startsOn && endsOn && endsOn < startsOn) fieldErrors.endsOn = "End date must be on or after the start date.";

  const values = { name, year: String(year), slug, tagline, startsOn, endsOn, setActive: setActive ? "on" : "" };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const payload = {
    name,
    year,
    slug,
    tagline:  tagline || null,
    startsOn: startsOn ? new Date(startsOn).toISOString() : null,
    endsOn:   endsOn   ? new Date(endsOn).toISOString()   : null,
    setActive,
  };

  const res = await api.post<{ id: string }>("/api/seasons", payload);
  if (!res.ok) {
    if (res.code === "duplicate_slug") {
      return { fieldErrors: { slug: res.message }, values };
    }
    return { topError: res.message, values };
  }

  redirect(`/admin/seasons/${res.data.id}`);
}
