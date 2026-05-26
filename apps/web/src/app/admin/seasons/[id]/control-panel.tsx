"use client";
import { useState, useTransition } from "react";
import { activateSeasonAction, toggleRegistrationAction } from "./actions";
import "../../admin.css";
import "./edit.css";

interface Props {
  seasonId:         string;
  seasonName:       string;
  isActive:         boolean;
  registrationOpen: boolean;
}

export function ControlPanel({ seasonId, seasonName, isActive, registrationOpen }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimisticOpen, setOptimisticOpen]   = useState(registrationOpen);
  const [optimisticActive, setOptimisticActive] = useState(isActive);
  const [topError, setTopError] = useState<string | null>(null);

  function onToggleRegistration() {
    const next = !optimisticOpen;
    setOptimisticOpen(next);
    setTopError(null);
    startTransition(async () => {
      const res = await toggleRegistrationAction(seasonId, next);
      if (!res.ok) {
        setOptimisticOpen(!next);   // rollback
        setTopError(res.message ?? "Could not update registration.");
      }
    });
  }

  function onActivate() {
    if (optimisticActive) return;
    setOptimisticActive(true);
    setTopError(null);
    startTransition(async () => {
      const res = await activateSeasonAction(seasonId);
      if (!res.ok) {
        setOptimisticActive(false);
        setTopError(res.message ?? "Could not activate season.");
      }
    });
  }

  return (
    <aside className="controlPanel">
      <div className="panel">
        <header className="panelHeader" style={{ marginBottom: 14 }}>
          <div>
            <div className="panelEyebrow">Control</div>
            <h2 className="panelTitle">Visibility</h2>
          </div>
        </header>

        <div className={`controlRow ${optimisticActive ? "is-success" : ""}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="toggleLabelHeader">Active season</span>
            <span className="toggleLabelHint">
              {optimisticActive
                ? "This is the season shown on the public home page."
                : "Activate to publish this season — the current active one will be demoted."}
            </span>
          </div>
          {optimisticActive ? (
            <span className="statusPill is-active" aria-label="Active">Active</span>
          ) : (
            <button
              type="button"
              className="adminBtn adminBtnGold"
              onClick={onActivate}
              disabled={pending}
            >
              {pending ? "…" : "Activate"}
            </button>
          )}
        </div>

        <div
          className={`controlRow ${optimisticOpen ? "is-success" : "is-warning"}`}
          style={{ marginTop: 10 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="toggleLabelHeader">Registration</span>
            <span className="toggleLabelHint">
              {optimisticOpen
                ? "Captains can register their teams from the home page."
                : "Home page shows the closed-registration notice; sport cards display a “Closed” pill."}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleRegistration}
            disabled={pending}
            className={`toggleSwitch ${optimisticOpen ? "is-on" : ""}`}
            aria-label={`${optimisticOpen ? "Close" : "Open"} registration for ${seasonName}`}
            style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
          >
            <span className="toggleTrack"><span className="toggleThumb" /></span>
          </button>
        </div>

        {topError && (
          <p style={{ marginTop: 14, color: "var(--color-danger)", fontSize: 13 }} role="alert">
            {topError}
          </p>
        )}
      </div>
    </aside>
  );
}
