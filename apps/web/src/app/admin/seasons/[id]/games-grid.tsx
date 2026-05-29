"use client";
import { useState, useTransition } from "react";
import { toggleGameRegistrationAction } from "./actions";
import "../../admin.css";
import "./edit.css";

interface ContactView { name: string; phoneDisplay: string; phoneE164: string; }

export interface GameRow {
  id:               string;
  slug:             string;            // "cricket" | "badminton" | "volleyball"
  name:             string;
  venue?:           string;
  categories?:      string;
  entryFeeRupees:   number;
  startsOn?:        string;
  endsOn?:          string;
  whatsAppGroupUrl?: string;
  registrationOpen: boolean;
  contacts:         ContactView[];
}

interface Props {
  seasonId:    string;
  games:       GameRow[];
  masterOpen:  boolean;
}

function formatRange(startIso?: string, endIso?: string): string | null {
  if (!startIso) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso);
}

export function GamesGrid({ seasonId, games, masterOpen }: Props) {
  const [openState, setOpenState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(games.map((g) => [g.id, g.registrationOpen])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowError,  setRowError]  = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();

  function onToggle(g: GameRow) {
    if (!masterOpen) return;
    const current = openState[g.id];
    const next    = !current;
    setOpenState((s) => ({ ...s, [g.id]: next }));
    setPendingId(g.id);
    setRowError(null);
    startTransition(async () => {
      const res = await toggleGameRegistrationAction(seasonId, g.id, next);
      setPendingId(null);
      if (!res.ok) {
        setOpenState((s) => ({ ...s, [g.id]: current })); // rollback
        setRowError({ id: g.id, message: res.message ?? `Could not update ${g.name}.` });
      }
    });
  }

  return (
    <div className="gamesGrid">
      {games.map((g) => {
        const stored          = openState[g.id];
        const forcedClosed    = !masterOpen;
        const isClosed        = !stored;              // per-game stored as closed
        const isPending       = pendingId === g.id;
        const showRowError    = rowError?.id === g.id;

        const tileClasses = [
          "gameTile",
          g.slug,
          forcedClosed                ? "is-forced-closed" : "",
          !forcedClosed && isClosed   ? "is-closed"        : "",
        ].filter(Boolean).join(" ");

        return (
          <article key={g.id} className={tileClasses}>
            {(forcedClosed || isClosed) && (
              <span className="gameTileClosedPill" aria-hidden="true">Closed</span>
            )}

            <h3 className="gameTileName">{g.name}</h3>
            <div className="gameTileMeta">
              {g.venue      && <span><strong>Venue:</strong> {g.venue}</span>}
              {g.categories && <span><strong>Categories:</strong> {g.categories}</span>}
              <span><strong>Entry fee:</strong> ₹{g.entryFeeRupees.toLocaleString("en-IN")}</span>
              {(g.startsOn || g.endsOn) && (
                <span><strong>When:</strong> {formatRange(g.startsOn, g.endsOn)}</span>
              )}
            </div>

            {g.contacts.length > 0 && (
              <div className="gameTileContacts">
                {g.contacts.map((c) => (
                  <span key={c.phoneE164}>{c.name} · {c.phoneDisplay}</span>
                ))}
              </div>
            )}

            {g.whatsAppGroupUrl && (
              <a className="gameTileLink" href={g.whatsAppGroupUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp Group ↗
              </a>
            )}

            <div className={`gameTileToggleRow ${isPending ? "is-pending" : ""}`}>
              <span className="gameTileToggleLabel" aria-live="polite">
                <span className="dot" aria-hidden="true" />
                Registration · {forcedClosed ? "Season closed" : stored ? "Open" : "Closed"}
              </span>
              <button
                type="button"
                onClick={() => onToggle(g)}
                disabled={forcedClosed || isPending}
                aria-disabled={forcedClosed}
                aria-pressed={stored}
                aria-label={`${stored ? "Close" : "Open"} registration for ${g.name}`}
                className={`toggleSwitch ${stored ? "is-on" : ""}`}
                style={{ border: 0, background: "transparent", padding: 0, cursor: forcedClosed ? "not-allowed" : "pointer" }}
              >
                <span className="toggleTrack"><span className="toggleThumb" /></span>
              </button>
            </div>

            {showRowError && (
              <p className="gameTileError" role="alert">{rowError!.message}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
