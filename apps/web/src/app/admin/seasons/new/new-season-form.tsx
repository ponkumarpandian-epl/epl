"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { createSeasonAction, type NewSeasonState } from "./actions";
import "./new-season.css";

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function HashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="9" x2="20" y2="9"/>
      <line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/>
      <line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatRange(start: string, end: string): string | null {
  if (!start) return null;
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return null;
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (!end) return fmt(s);
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}

export function NewSeasonForm() {
  const [state, formAction] = useActionState<NewSeasonState | undefined, FormData>(createSeasonAction, undefined);

  // Live preview state (mirrors form inputs as user types)
  const [name,      setName]      = useState(state?.values?.name      ?? "Season 3");
  const [year,      setYear]      = useState(state?.values?.year      ?? "2027");
  const [slug,      setSlug]      = useState(state?.values?.slug      ?? "season-3");
  const [tagline,   setTagline]   = useState(state?.values?.tagline   ?? "");
  const [startsOn,  setStartsOn]  = useState(state?.values?.startsOn  ?? "");
  const [endsOn,    setEndsOn]    = useState(state?.values?.endsOn    ?? "");
  const [setActive, setSetActive] = useState(state?.values?.setActive === "on");
  const [slugDirty, setSlugDirty] = useState(false);

  // Auto-derive slug from name unless user manually edits the slug
  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setName(v);
    if (!slugDirty) setSlug(slugify(v));
  }

  const dateRange = formatRange(startsOn, endsOn);

  return (
    <form action={formAction} noValidate className="newSeasonGrid">
      {/* ── Form column ── */}
      <div className="formStack">
        <div className="formGroup">
          <label htmlFor="name">Season Name *</label>
          <input
            id="name" name="name" required
            className={`formInput ${state?.fieldErrors?.name ? "formInputError" : ""}`}
            placeholder="e.g. Season 3"
            value={name}
            onChange={onNameChange}
          />
          {state?.fieldErrors?.name && <span className="fieldErr">{state.fieldErrors.name}</span>}
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label htmlFor="year">Year *</label>
            <input
              id="year" name="year" type="number" min={2025} max={2100} required
              className={`formInput ${state?.fieldErrors?.year ? "formInputError" : ""}`}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            {state?.fieldErrors?.year && <span className="fieldErr">{state.fieldErrors.year}</span>}
          </div>
          <div className="formGroup">
            <label htmlFor="slug">URL Slug *</label>
            <input
              id="slug" name="slug" required
              className={`formInput ${state?.fieldErrors?.slug ? "formInputError" : ""}`}
              placeholder="season-3"
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugDirty(true); }}
            />
            {state?.fieldErrors?.slug
              ? <span className="fieldErr">{state.fieldErrors.slug}</span>
              : <span className="fieldHint">Lowercase, dashes only. Used in URLs.</span>}
          </div>
        </div>

        <div className="formGroup">
          <label htmlFor="tagline">Tagline</label>
          <input
            id="tagline" name="tagline" maxLength={120}
            className="formInput"
            placeholder="e.g. Pride of E-City"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
          <span className="fieldHint">
            Shown as the hero headline. First word gets cyan accent, last word gets gold.
          </span>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label htmlFor="startsOn">Starts On</label>
            <input
              id="startsOn" name="startsOn" type="date"
              className="formInput"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>
          <div className="formGroup">
            <label htmlFor="endsOn">Ends On</label>
            <input
              id="endsOn" name="endsOn" type="date"
              className={`formInput ${state?.fieldErrors?.endsOn ? "formInputError" : ""}`}
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
            {state?.fieldErrors?.endsOn && <span className="fieldErr">{state.fieldErrors.endsOn}</span>}
          </div>
        </div>

        <div className="formGroup">
          <label className={`toggleSwitch ${setActive ? "is-on" : ""}`} style={{ alignSelf: "flex-start" }}>
            <input
              type="checkbox" name="setActive"
              checked={setActive}
              onChange={(e) => setSetActive(e.target.checked)}
              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
            />
            <span className="toggleTrack"><span className="toggleThumb" /></span>
            <span className="toggleLabel">
              <span className="toggleLabelHeader">Set as active season</span>
              <span className="toggleLabelHint">
                The current active season will be demoted. Public home page shows only the active one.
              </span>
            </span>
          </label>
        </div>

        {state?.topError && (
          <div className="fieldErr" role="alert">{state.topError}</div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" className="adminBtn adminBtnPrimary">
            Create Season →
          </button>
          <Link href="/admin/seasons" className="adminBtn adminBtnGhost">Cancel</Link>
        </div>
      </div>

      {/* ── Live preview ── */}
      <aside className="previewSticky">
        <span className="previewLabel">Live preview</span>
        <div className="previewCard">
          <div className="previewYear">{year || "—"}</div>
          <h2 className="previewName">{name || "Season name"}</h2>
          {tagline && <span className="previewTagline">“{tagline}”</span>}

          <div className="previewMeta">
            <span className="previewMetaRow">
              <CalendarIcon />
              {dateRange ?? <span className="previewEmpty">Dates not set</span>}
            </span>
            <span className="previewMetaRow">
              <HashIcon />
              <span style={{ fontFamily: "var(--font-mono)" }}>/{slug || "season-slug"}</span>
            </span>
          </div>

          <div className="previewPills">
            <span className={`statusPill ${setActive ? "is-active" : "is-inactive"}`}>
              {setActive ? "Will be active" : "Inactive (draft)"}
            </span>
            <span className="statusPill is-open">Registration Open</span>
          </div>
        </div>
      </aside>
    </form>
  );
}
