"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import type { GameMasterDto } from "@/lib/seasons";
import { FORMAT_LABEL, type CategoryFormat } from "@/lib/tournaments-types";
import { createTournamentAction, type NewTournamentState } from "./actions";

const ALL_FORMATS: CategoryFormat[] = ["Singles", "MensDoubles", "WomensDoubles", "MixedDoubles"];

interface CategoryRow {
  id:       string;            // stable React key (not the DB id; this row hasn't been saved)
  name:     string;
  format:   CategoryFormat | "";
  minEntries: string;
  maxEntries: string;
  fee:      string;
}

function newRow(format: CategoryFormat | "" = ""): CategoryRow {
  return {
    id:         crypto.randomUUID(),
    name:       format ? FORMAT_LABEL[format] : "",
    format,
    minEntries: "8",
    maxEntries: "16",
    fee:        "0",
  };
}

function autoSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  );
}

export function NewTournamentForm({ games }: { games: GameMasterDto[] }) {
  const [state, action, pending] = useActionState<NewTournamentState | undefined, FormData>(
    createTournamentAction,
    undefined,
  );

  // Seed categories from the previous attempt (so server-rejected forms re-render with the user's
  // last input) — otherwise default to Singles + MensDoubles.
  const initial: CategoryRow[] = (() => {
    const v = state?.values ?? {};
    const out: CategoryRow[] = [];
    for (let i = 0; i < 8; i++) {
      const name = v[`cat-${i}-name`];
      const fmt  = v[`cat-${i}-format`] as CategoryFormat | undefined;
      if (!name && !fmt) continue;
      out.push({
        id: crypto.randomUUID(),
        name: name ?? "",
        format: (fmt as CategoryFormat) ?? "",
        minEntries: v[`cat-${i}-min`] ?? "8",
        maxEntries: v[`cat-${i}-max`] ?? "16",
        fee:        v[`cat-${i}-fee`] ?? "0",
      });
    }
    return out.length > 0 ? out : [newRow("Singles"), newRow("MensDoubles")];
  })();

  const [cats, setCats] = useState<CategoryRow[]>(initial);
  const [name, setName] = useState<string>(state?.values?.name ?? "");
  const [slug, setSlug] = useState<string>(state?.values?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(state?.values?.slug));

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(autoSlug(v));
  }

  function patch(idx: number, partial: Partial<CategoryRow>) {
    setCats((prev) => prev.map((r, i) => (i === idx ? { ...r, ...partial } : r)));
  }
  function addRow() {
    if (cats.length >= 8) return;
    const used = new Set(cats.map((c) => c.format).filter(Boolean));
    const next = ALL_FORMATS.find((f) => !used.has(f)) ?? "";
    setCats([...cats, newRow(next)]);
  }
  function removeRow(idx: number) {
    setCats((prev) => prev.filter((_, i) => i !== idx));
  }

  const usedFormats = new Set(cats.map((c) => c.format).filter(Boolean) as CategoryFormat[]);

  return (
    <form action={action} className="adminTournForm">

      {state?.topError && (
        <div className="adminTournFormTopErr" role="alert">{state.topError}</div>
      )}

      <section className="adminTournFormCard">
        <h2>Basics</h2>
        <p className="help">Name and sport are required. Slug auto-fills from the name; edit it if you need a custom URL.</p>

        <div className="adminTournField">
          <label htmlFor="name">Name *</label>
          <div>
            <input
              id="name" name="name" required maxLength={120}
              placeholder="Smashify Open · March 2026"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
            {state?.fieldErrors?.name && <span className="adminTournFieldErr">{state.fieldErrors.name}</span>}
          </div>
        </div>

        <div className="adminTournField">
          <label htmlFor="slug">Slug *</label>
          <div>
            <input
              id="slug" name="slug" required maxLength={60}
              placeholder="smashify-open-mar-2026"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
            />
            {state?.fieldErrors?.slug && <span className="adminTournFieldErr">{state.fieldErrors.slug}</span>}
          </div>
        </div>

        <div className="adminTournField">
          <label htmlFor="gameId">Sport *</label>
          <div>
            <select id="gameId" name="gameId" required defaultValue={state?.values?.gameId ?? games.find((g) => g.kind === "Badminton")?.id ?? ""}>
              <option value="" disabled>Pick a sport</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {state?.fieldErrors?.gameId && <span className="adminTournFieldErr">{state.fieldErrors.gameId}</span>}
          </div>
        </div>

        <div className="adminTournField">
          <label htmlFor="tagline">Tagline</label>
          <input id="tagline" name="tagline" maxLength={200} placeholder="Open badminton · prize money for top 3"
            defaultValue={state?.values?.tagline ?? ""} />
        </div>

        <div className="adminTournField">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" maxLength={1200} placeholder="One paragraph — what to expect, who can play, what's at stake."
            defaultValue={state?.values?.description ?? ""} />
        </div>
      </section>

      <section className="adminTournFormCard">
        <h2>When &amp; where</h2>
        <p className="help">All dates are optional. If you set both start and end, end must come after start.</p>

        <div className="adminTournField">
          <label>Dates</label>
          <div className="adminTournFieldRow">
            <input type="date" name="startsOn" defaultValue={state?.values?.startsOn ?? ""} aria-label="Starts on" />
            <input type="date" name="endsOn"   defaultValue={state?.values?.endsOn ?? ""}   aria-label="Ends on" />
          </div>
        </div>
        {state?.fieldErrors?.endsOn && <div className="adminTournFieldErr" style={{ marginLeft: 214 }}>{state.fieldErrors.endsOn}</div>}

        <div className="adminTournField">
          <label htmlFor="deadline">Registration closes</label>
          <input id="deadline" type="datetime-local" name="deadline" defaultValue={state?.values?.deadline ?? ""} />
        </div>
        {state?.fieldErrors?.deadline && <div className="adminTournFieldErr" style={{ marginLeft: 214 }}>{state.fieldErrors.deadline}</div>}

        <div className="adminTournField">
          <label htmlFor="venue">Venue</label>
          <input id="venue" name="venue" maxLength={200} placeholder="Smashify Academy, EC Phase 1" defaultValue={state?.values?.venue ?? ""} />
        </div>
      </section>

      <section className="adminTournFormCard">
        <h2>Money &amp; comms</h2>
        <p className="help">The fee applies as the default; a category can override below.</p>

        <div className="adminTournField">
          <label htmlFor="fee">Default entry fee (₹)</label>
          <div>
            <input id="fee" name="fee" type="number" min={0} step={50} defaultValue={state?.values?.fee ?? "0"} />
            {state?.fieldErrors?.fee && <span className="adminTournFieldErr">{state.fieldErrors.fee}</span>}
          </div>
        </div>

        <div className="adminTournField">
          <label htmlFor="whatsApp">WhatsApp group URL</label>
          <input id="whatsApp" name="whatsApp" maxLength={400} placeholder="https://chat.whatsapp.com/…" defaultValue={state?.values?.whatsApp ?? ""} />
        </div>

        <div className="adminTournField">
          <label htmlFor="banner">Banner image URL</label>
          <input id="banner" name="banner" maxLength={400} placeholder="https://… (Azure Blob URL)" defaultValue={state?.values?.banner ?? ""} />
        </div>
      </section>

      <section className="adminTournFormCard">
        <h2>Categories</h2>
        <p className="help">Add one row per format you&apos;ll run. Each gets its own entry list and (later) its own draw.</p>

        {cats.map((c, i) => (
          <div key={c.id} className="catRow">
            <div>
              <div className="catLabel">Name</div>
              <input
                name={`cat-${i}-name`}
                placeholder="Men's Doubles"
                value={c.name}
                onChange={(e) => patch(i, { name: e.target.value })}
              />
            </div>
            <div>
              <div className="catLabel">Format</div>
              <select
                name={`cat-${i}-format`}
                value={c.format}
                onChange={(e) => {
                  const f = e.target.value as CategoryFormat | "";
                  // Auto-fill the name if it's empty or still matches the previous default
                  const defaultPrev = c.format ? FORMAT_LABEL[c.format] : "";
                  const newName = !c.name || c.name === defaultPrev ? (f ? FORMAT_LABEL[f] : "") : c.name;
                  patch(i, { format: f, name: newName });
                }}
              >
                <option value="" disabled>Pick…</option>
                {ALL_FORMATS.map((f) => (
                  <option key={f} value={f} disabled={f !== c.format && usedFormats.has(f)}>
                    {FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="catLabel">Min</div>
              <input name={`cat-${i}-min`} type="number" min={2} max={256} value={c.minEntries} onChange={(e) => patch(i, { minEntries: e.target.value })} />
            </div>
            <div>
              <div className="catLabel">Max</div>
              <input name={`cat-${i}-max`} type="number" min={2} max={256} value={c.maxEntries} onChange={(e) => patch(i, { maxEntries: e.target.value })} />
            </div>
            <div>
              <div className="catLabel">Fee ₹</div>
              <input name={`cat-${i}-fee`} type="number" min={0} step={50} value={c.fee} onChange={(e) => patch(i, { fee: e.target.value })} />
            </div>
            <div>
              <div className="catLabel">&nbsp;</div>
              <button type="button" className="catRemoveBtn" onClick={() => removeRow(i)} aria-label="Remove category">
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}

        <button type="button" onClick={addRow} disabled={cats.length >= 8} className="adminBtn adminBtnGhost" style={{ marginTop: 8 }}>
          + Add category
        </button>
      </section>

      <section className="adminTournFormCard">
        <h2>Status</h2>
        <p className="help">Keep it as a draft until you&apos;re ready to share the link publicly.</p>

        <div className="adminTournField adminTournFieldToggle">
          <label htmlFor="regOpen">Registration</label>
          <label className="adminTournToggle" htmlFor="regOpen">
            <span className="adminTournToggleText">
              <span className="adminTournToggleTitle">Open for entries</span>
              <span className="adminTournToggleHint">
                Players can submit team entries while this is on. Turn off to freeze new registrations.
              </span>
            </span>
            <input
              id="regOpen"
              name="regOpen"
              type="checkbox"
              className="adminTournToggleInput"
              defaultChecked={state?.values?.regOpen === "on" || !state?.values}
            />
            <span className="adminTournToggleTrack" aria-hidden="true">
              <span className="adminTournToggleThumb" />
            </span>
          </label>
        </div>

        <div className="adminTournField adminTournFieldToggle">
          <label htmlFor="publish">Publish</label>
          <label className="adminTournToggle" htmlFor="publish">
            <span className="adminTournToggleText">
              <span className="adminTournToggleTitle">Show on the public Tournaments hub</span>
              <span className="adminTournToggleHint">
                When off, the tournament stays as a draft and is hidden from the public list.
              </span>
            </span>
            <input
              id="publish"
              name="publish"
              type="checkbox"
              className="adminTournToggleInput"
              defaultChecked={state?.values?.publish === "on"}
            />
            <span className="adminTournToggleTrack" aria-hidden="true">
              <span className="adminTournToggleThumb" />
            </span>
          </label>
        </div>
      </section>

      <div className="adminTournFormFoot">
        <Link href="/admin/tournaments" className="adminBtn adminBtnGhost">Cancel</Link>
        <button type="submit" disabled={pending} className="adminBtn adminBtnPrimary">
          {pending ? "Creating…" : "Create Tournament →"}
        </button>
      </div>
    </form>
  );
}
