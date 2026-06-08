"use client";

import { useTransition } from "react";
import { reseedBracketAction } from "./actions";
import type { BracketParticipantDto } from "@/lib/brackets-types";

interface SeedTableProps {
  tournamentId: string;
  bracketId:    string;
  categoryId:   string;
  participants: BracketParticipantDto[];
}

/**
 * Client component: a single form holding one seed input per non-bye participant.
 * Submitting POSTs the whole list — the action wipes the bracket and rebuilds with the new seeds.
 * Drag-and-drop seeding is a follow-up; numeric inputs are functionally equivalent for T-3.
 */
export function SeedTable({ tournamentId, bracketId, categoryId, participants }: SeedTableProps) {
  const [pending, startTransition] = useTransition();

  if (participants.length === 0) {
    return (
      <p className="adminBracketEmpty" style={{ margin: 0 }}>
        No real participants in this bracket — confirm entries and regenerate.
      </p>
    );
  }

  return (
    <form
      className="adminBracketSeedForm"
      action={(formData) => startTransition(() => reseedBracketAction(formData))}
    >
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="bracketId"    value={bracketId} />
      <input type="hidden" name="categoryId"   value={categoryId} />

      <header className="adminBracketSeedHeader">
        <h3>Seeds</h3>
        <p>Lowest number = top seed. Leave blank to drop a participant to the bottom of the draw.</p>
      </header>

      <ol className="adminBracketSeedList">
        {participants
          .slice()
          .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
          .map((p) => (
            <li key={p.id} className="adminBracketSeedRow">
              <input
                type="number"
                name={`seed-${p.id}`}
                min={1}
                max={256}
                defaultValue={p.seed ?? ""}
                aria-label={`Seed for ${p.displayName}`}
                className="adminBracketSeedInput"
              />
              <span className="adminBracketSeedName">{p.displayName}</span>
            </li>
          ))}
      </ol>

      <button type="submit" disabled={pending} className="adminBtn adminBtnPrimary">
        {pending ? "Saving…" : "Save seeds + regenerate draw"}
      </button>
    </form>
  );
}
