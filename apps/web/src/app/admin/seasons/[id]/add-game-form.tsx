"use client";
import { useState, useTransition } from "react";
import { addGameToSeasonAction, type AddGameInput } from "./actions";
import type { GameMasterDto } from "@/lib/seasons";
import "./edit.css";
import "../new/new-season.css";

interface Props {
  seasonId:           string;
  availableGames:     GameMasterDto[];   // all master games
  attachedGameIds:    Set<string>;       // games already attached to this season
}

export function AddGameForm({ seasonId, availableGames, attachedGameIds }: Props) {
  const [expanded, setExpanded]   = useState(false);
  const [pending, startTransition] = useTransition();
  const [topError, setTopError]   = useState<string | null>(null);

  const [gameId, setGameId]       = useState<string>("");
  const [venue, setVenue]         = useState("");
  const [categories, setCategories] = useState("");
  const [entryFee, setEntryFee]   = useState("5000");
  const [startsOn, setStartsOn]   = useState("");
  const [endsOn, setEndsOn]       = useState("");
  const [waUrl, setWaUrl]         = useState("");

  function reset() {
    setGameId(""); setVenue(""); setCategories(""); setEntryFee("5000");
    setStartsOn(""); setEndsOn(""); setWaUrl(""); setTopError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!gameId) { setTopError("Please pick a sport."); return; }
    setTopError(null);
    const input: AddGameInput = {
      gameId,
      venue:            venue || undefined,
      categories:       categories || undefined,
      entryFeeRupees:   Number(entryFee) || 0,
      startsOn:         startsOn || undefined,
      endsOn:           endsOn || undefined,
      whatsAppGroupUrl: waUrl || undefined,
    };
    startTransition(async () => {
      const res = await addGameToSeasonAction(seasonId, input);
      if (!res.ok) { setTopError(res.message ?? "Could not attach game."); return; }
      reset();
      setExpanded(false);
    });
  }

  if (!expanded) {
    return (
      <div className="addGameWrap">
        <button
          type="button"
          className="adminBtn adminBtnGold addGameToggleBtn"
          onClick={() => setExpanded(true)}
        >
          + Add a sport to this season
        </button>
      </div>
    );
  }

  const slugOf = availableGames.find((g) => g.id === gameId)?.slug ?? "";

  return (
    <form onSubmit={onSubmit} className="panel addGameWrap">
      <div className="panelHeader">
        <div>
          <div className="panelEyebrow">Attach Sport</div>
          <h3 className="panelTitle">Add a Game</h3>
        </div>
        <button type="button" className="adminBtn adminBtnGhost" onClick={() => { reset(); setExpanded(false); }}>
          Cancel
        </button>
      </div>

      {/* Sport chip picker */}
      <div className="gamePicker" role="radiogroup" aria-label="Sport">
        {availableGames.map((g) => {
          const taken = attachedGameIds.has(g.id);
          const isSel = gameId === g.id;
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={isSel}
              disabled={taken}
              className={`gamePickerBtn ${isSel ? "is-selected" : ""}`}
              onClick={() => setGameId(g.id)}
              title={taken ? "Already attached to this season" : g.name}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      <div className="formStack">
        <div className="formRow">
          <div className="formGroup">
            <label htmlFor={`venue-${slugOf}`}>Venue</label>
            <input id={`venue-${slugOf}`} className="formInput" placeholder="e.g. JMR Cricket Ground, EC Phase 1"
                   value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="formGroup">
            <label htmlFor={`cat-${slugOf}`}>Categories</label>
            <input id={`cat-${slugOf}`} className="formInput" placeholder="e.g. Men's, Men's & Women's Doubles"
                   value={categories} onChange={(e) => setCategories(e.target.value)} />
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label htmlFor={`fee-${slugOf}`}>Entry Fee (₹)</label>
            <input id={`fee-${slugOf}`} className="formInput" type="number" min={0} step={100}
                   value={entryFee} onChange={(e) => setEntryFee(e.target.value)} />
          </div>
          <div className="formGroup">
            <label htmlFor={`wa-${slugOf}`}>WhatsApp group link</label>
            <input id={`wa-${slugOf}`} className="formInput" type="url"
                   placeholder="https://chat.whatsapp.com/..."
                   value={waUrl} onChange={(e) => setWaUrl(e.target.value)} />
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label htmlFor={`start-${slugOf}`}>Starts on</label>
            <input id={`start-${slugOf}`} className="formInput" type="date"
                   value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div className="formGroup">
            <label htmlFor={`end-${slugOf}`}>Ends on</label>
            <input id={`end-${slugOf}`} className="formInput" type="date"
                   value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>

        {topError && <span className="fieldErr" role="alert">{topError}</span>}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" className="adminBtn adminBtnPrimary" disabled={pending || !gameId}>
            {pending ? "Attaching…" : "Attach to season"}
          </button>
          <button type="button" className="adminBtn adminBtnGhost" onClick={() => { reset(); setExpanded(false); }}>
            Cancel
          </button>
        </div>
        <span className="fieldHint">
          Contacts can be added via the API. UI coming soon.
        </span>
      </div>
    </form>
  );
}
