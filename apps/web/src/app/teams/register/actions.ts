"use server";
import { redirect } from "next/navigation";
import { teamRegisterSchema, type Sport } from "@/lib/schemas";
import { api } from "@/lib/api";

export interface TeamRegisterState {
  values?: {
    sport?:         Sport;
    apartmentName?: string;
    teamName?:      string;
    captainName?:   string;
    captainMobile?: string;
    apartmentAddress?: string;
    apartmentLat?:  number;
    apartmentLng?:  number;
  };
  fieldErrors?: Record<string, string>;
  topError?:    string;
}

function sportToBackend(s: Sport): "Cricket" | "Badminton" | "Volleyball" {
  return s === "cricket" ? "Cricket" : s === "badminton" ? "Badminton" : "Volleyball";
}

export async function registerTeamAction(_prev: TeamRegisterState | undefined, formData: FormData): Promise<TeamRegisterState> {
  const raw = {
    sport:           String(formData.get("sport")           ?? ""),
    apartmentName:   String(formData.get("apartmentName")   ?? ""),
    teamName:        String(formData.get("teamName")        ?? ""),
    captainName:     String(formData.get("captainName")     ?? ""),
    captainMobile:   String(formData.get("captainMobile")   ?? ""),
    apartmentAddress: String(formData.get("apartmentAddress") ?? ""),
    apartmentLat:    Number(formData.get("apartmentLat")    ?? NaN),
    apartmentLng:    Number(formData.get("apartmentLng")    ?? NaN),
  };
  const seasonGameIdRaw = String(formData.get("seasonGameId") ?? "").trim();
  const seasonGameId    = seasonGameIdRaw.length > 0 ? seasonGameIdRaw : undefined;

  const parsed = teamRegisterSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return {
      fieldErrors,
      values: {
        sport: (["cricket","badminton","volleyball"].includes(raw.sport) ? raw.sport as Sport : undefined),
        apartmentName:    raw.apartmentName,
        teamName:         raw.teamName,
        captainName:      raw.captainName,
        captainMobile:    raw.captainMobile,
        apartmentAddress: raw.apartmentAddress,
        apartmentLat:     Number.isFinite(raw.apartmentLat) ? raw.apartmentLat : undefined,
        apartmentLng:     Number.isFinite(raw.apartmentLng) ? raw.apartmentLng : undefined,
      },
    };
  }

  const payload = {
    ...parsed.data,
    sport:        sportToBackend(parsed.data.sport),
    seasonGameId: seasonGameId ?? null,
  };

  const res = await api.post<{ id: string }>("/api/teams", payload);
  if (!res.ok) {
    return {
      topError: res.message,
      values:   parsed.data,
    };
  }

  // Pass the sport slug + team name into the thanks page so the WhatsApp CTA
  // can resolve which group to highlight.
  const params = new URLSearchParams({
    sport:    parsed.data.sport,
    teamName: parsed.data.teamName,
  });
  redirect(`/teams/register/thanks?${params.toString()}`);
}
