"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { registerEntry } from "@/lib/tournaments";
import type { CategoryFormat } from "@/lib/tournaments";
import { getCurrentUser } from "@/lib/auth";

/** Shape used by `useActionState` — persisted across re-renders when validation fails. */
export interface RegisterEntryState {
  topError?:    string;
  fieldErrors?: Partial<Record<"player1Name" | "player1Mobile" | "player2Name" | "player2Mobile" | "teamLabel", string>>;
  /** Values the user typed last, so the form re-renders with their input after a server-side rejection. */
  values?:      Record<string, string>;
}

function val(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function normaliseMobile(raw: string): string {
  // Accept "+91 95913 37122", "9591337122", "+919591337122" — coerce to E.164.
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return "+" + digits;
  // 10-digit Indian mobile → prepend +91.
  if (digits.length === 10) return "+91" + digits;
  return "+" + digits;
}

export async function registerEntryAction(
  slug: string,
  categoryId: string,
  format: CategoryFormat,
  _prev: RegisterEntryState | undefined,
  form: FormData,
): Promise<RegisterEntryState> {
  // Resolve identity server-side. If the user is signed in, their profile is the source of
  // truth for Player 1 — we ignore any client-supplied values for that slot.
  const me = await getCurrentUser();

  let player1Name   = val(form, "player1Name");
  let player1Mobile = normaliseMobile(val(form, "player1Mobile"));
  const player2Name   = val(form, "player2Name");
  const player2Mobile = normaliseMobile(val(form, "player2Mobile"));
  const teamLabel     = val(form, "teamLabel");

  if (me) {
    player1Name = me.fullName;
    // If the profile has a mobile, trust it; otherwise keep what they typed (the form is
    // configured to ask for one when phoneNumber is null on the profile).
    if (me.phoneNumber) player1Mobile = normaliseMobile(me.phoneNumber);
  }

  const isDoubles = format !== "Singles";

  const fieldErrors: RegisterEntryState["fieldErrors"] = {};
  if (!player1Name)        fieldErrors.player1Name   = "Your name is required.";
  else if (player1Name.length < 2) fieldErrors.player1Name = "Name is too short.";
  if (!player1Mobile)      fieldErrors.player1Mobile = "Mobile number is required.";
  else if (!/^\+\d{8,15}$/.test(player1Mobile)) fieldErrors.player1Mobile = "Use a valid mobile (e.g. +919XXXXXXXXX).";

  if (isDoubles) {
    if (!player2Name)       fieldErrors.player2Name   = "Partner's name is required for doubles.";
    if (!player2Mobile)     fieldErrors.player2Mobile = "Partner's mobile is required.";
    else if (!/^\+\d{8,15}$/.test(player2Mobile)) fieldErrors.player2Mobile = "Use a valid mobile.";
    if (player2Mobile && player2Mobile === player1Mobile) {
      fieldErrors.player2Mobile = "Partner mobile must be different from yours.";
    }
  }

  const values = { player1Name, player1Mobile, player2Name, player2Mobile, teamLabel };

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  const res = await registerEntry(slug, categoryId, {
    player1Name,
    player1Mobile,
    player2Name:   isDoubles ? player2Name   : undefined,
    player2Mobile: isDoubles ? player2Mobile : undefined,
    teamLabel:     teamLabel || undefined,
  });

  if (!res.ok) {
    // Map a few server error codes to friendlier copy / specific field highlights.
    if (res.code === "duplicate_mobile") {
      return {
        topError:    "This mobile number is already registered for this category.",
        fieldErrors: { player1Mobile: "Already registered." },
        values,
      };
    }
    if (res.code === "category_full") {
      return { topError: "This category is full. Please choose another or contact the organisers.", values };
    }
    if (res.code === "registration_closed" || res.code === "tournament_not_published") {
      return { topError: res.message, values };
    }
    return { topError: res.message ?? "Could not submit your entry. Please try again.", values };
  }

  revalidatePath(`/tournaments/${slug}`);
  redirect(`/tournaments/${slug}?category=${format}&registered=1`);
}
