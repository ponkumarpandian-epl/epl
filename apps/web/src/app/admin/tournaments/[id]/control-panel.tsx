"use client";
import { useTransition } from "react";
import type { TournamentDetailDto } from "@/lib/tournaments";
import { togglePublishAction, toggleRegistrationAction } from "./actions";

export function TournamentControlPanel({ tournament }: { tournament: TournamentDetailDto }) {
  const [pending, start] = useTransition();

  function flipPublish() {
    start(() => { togglePublishAction(tournament.id, !tournament.isPublished); });
  }
  function flipRegistration() {
    start(() => { toggleRegistrationAction(tournament.id, !tournament.registrationOpen); });
  }

  return (
    <section className="adminTournFormCard" style={{ maxWidth: 900 }}>
      <h2>Status</h2>
      <p className="help">Drafts are hidden from the public hub. Closing registration cascades to every category.</p>

      <div className="adminTournField">
        <label>Visibility</label>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            background: tournament.isPublished ? "rgba(37, 211, 102, 0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${tournament.isPublished ? "rgba(37, 211, 102, 0.45)" : "var(--color-border)"}`,
            color: tournament.isPublished ? "#4ee586" : "var(--bone-fade)",
          }}>
            {tournament.isPublished ? "Published" : "Draft"}
          </span>
          <button
            type="button"
            onClick={flipPublish}
            disabled={pending}
            className="adminBtn adminBtnGhost"
          >
            {tournament.isPublished ? "Un-publish (return to draft)" : "Publish to the public hub"}
          </button>
        </div>
      </div>

      <div className="adminTournField">
        <label>Registration</label>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "6px 12px",
            borderRadius: "var(--radius-pill)",
            background: tournament.registrationOpen ? "rgba(232, 181, 61, 0.14)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${tournament.registrationOpen ? "rgba(232, 181, 61, 0.5)" : "var(--color-border)"}`,
            color: tournament.registrationOpen ? "var(--gold-bright)" : "var(--bone-fade)",
          }}>
            {tournament.registrationOpen ? "Open" : "Closed"}
          </span>
          <button
            type="button"
            onClick={flipRegistration}
            disabled={pending}
            className="adminBtn adminBtnGhost"
          >
            {tournament.registrationOpen ? "Close registration" : "Re-open registration"}
          </button>
        </div>
      </div>
    </section>
  );
}
