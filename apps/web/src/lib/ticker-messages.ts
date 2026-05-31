import type { RegistrationStats } from "./seasons";

/**
 * Discriminated union — `kind` decides which CSS class the renderer applies.
 * - "season-closed": shown when master is OFF; per-sport stats are suppressed
 * - "sport-closed":  per-sport registration toggled off but master is on
 * - "sport-open":    open with N teams registered
 * - "sport-empty":   open with 0 teams (positive framing — "be the first")
 * - "cta":           call-to-action; always tail of the loop
 */
export type TickerMessage =
  | { kind: "season-closed"; text: string }
  | { kind: "sport-closed";  sportSlug: string; sportName: string; teamCount: number; text: string }
  | { kind: "sport-open";    sportSlug: string; sportName: string; teamCount: number; text: string }
  | { kind: "sport-empty";   sportSlug: string; sportName: string; text: string }
  | { kind: "cta";           text: string };

const CTA_TEXT = "JOIN AT E-CITYPREMIERLEAGUE.IN";

/**
 * Pure function — easy to unit-test if/when tests come back.
 * Priority rules (also documented in plan/12):
 *   1. Master OFF → single repeated season-closed message, suppress per-sport.
 *   2. Per-sport closed messages rank ahead of open messages.
 *   3. Open sports with team counts come next.
 *   4. Open sports with zero teams use a positive "be the first" message.
 *   5. The CTA message always tails the list.
 */
export function buildTickerMessages(stats: RegistrationStats | null): TickerMessage[] {
  if (stats === null) {
    // Fallback when the stats endpoint failed — never break the hero.
    return [{ kind: "cta", text: CTA_TEXT }];
  }

  if (!stats.masterRegistrationOpen) {
    const text = stats.totalTeams > 0
      ? `REGISTRATION CLOSED FOR ${upperSeason(stats.seasonName)} · CONTACT ORGANISERS · ${stats.totalTeams} ${plural(stats.totalTeams, "TEAM", "TEAMS")} IN THE BOOKS`
      : `REGISTRATION CLOSED FOR ${upperSeason(stats.seasonName)} · CONTACT ORGANISERS`;
    return [{ kind: "season-closed", text }];
  }

  const closed: TickerMessage[] = [];
  const open:   TickerMessage[] = [];

  for (const s of stats.sports) {
    const sportUpper = s.name.toUpperCase();
    if (!s.registrationOpen) {
      const lock = s.teamCount > 0
        ? `${sportUpper} REGISTRATION CLOSED · ${s.teamCount} ${plural(s.teamCount, "TEAM", "TEAMS")} LOCKED IN`
        : `${sportUpper} REGISTRATION CLOSED`;
      closed.push({
        kind: "sport-closed",
        sportSlug: s.slug, sportName: s.name, teamCount: s.teamCount, text: lock,
      });
      continue;
    }

    if (s.teamCount === 0) {
      open.push({
        kind: "sport-empty",
        sportSlug: s.slug, sportName: s.name,
        text: `${sportUpper} REGISTRATION OPEN · BE THE FIRST TEAM`,
      });
      continue;
    }

    open.push({
      kind: "sport-open",
      sportSlug: s.slug, sportName: s.name, teamCount: s.teamCount,
      text: `${sportUpper} · ${s.teamCount} ${plural(s.teamCount, "TEAM", "TEAMS")} REGISTERED · STILL ACCEPTING`,
    });
  }

  return [...closed, ...open, { kind: "cta", text: CTA_TEXT }];
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

function upperSeason(name: string): string {
  // "Season 2" → "SEASON 2"; safe for any locale because the source is admin-typed English.
  return name.toUpperCase();
}
