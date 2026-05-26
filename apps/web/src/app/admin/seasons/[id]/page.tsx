import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeasonById, listAllGames } from "@/lib/seasons";
import { ControlPanel } from "./control-panel";
import { AddGameForm } from "./add-game-form";
import "../../admin.css";
import "./edit.css";

export const metadata: Metadata = { title: "Season" };

function formatRange(startIso?: string, endIso?: string): string | null {
  if (!startIso) return null;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso);
}

export default async function EditSeasonPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [season, masterGames] = await Promise.all([
    getSeasonById(id),
    listAllGames(),
  ]);
  if (!season) notFound();

  const attachedGameIds = new Set(season.games.map((g) => g.gameId));
  const dateRange = formatRange(season.startsOn, season.endsOn);

  return (
    <>
      <section className="adminHero">
        <div className="adminHeroInner">
          <div className="adminHeroTitleBlock">
            <span className="adminHeroEyebrow">{season.tagline ? `“${season.tagline}”` : "Edit Season"}</span>
            <h1 className="adminHeroTitle">{season.name} · {season.year}</h1>
            <p className="adminHeroLead">
              {dateRange ? `Window: ${dateRange}. ` : ""}
              Manage the sports running this season — add games, set fees, attach WhatsApp groups,
              and toggle registration from the right panel.
            </p>
          </div>
          <div className="adminHeroActions">
            <span className={`statusPill ${season.isActive ? "is-active" : "is-inactive"}`}>
              {season.isActive ? "Active season" : "Inactive"}
            </span>
            <span className={`statusPill ${season.registrationOpen ? "is-open" : "is-closed"}`}>
              {season.registrationOpen ? "Registration open" : "Registration closed"}
            </span>
            <Link href="/admin/seasons" className="adminBtn adminBtnGhost">← Back</Link>
          </div>
        </div>
      </section>

      <div className="editGrid">
        {/* ── Main column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel">
            <header className="panelHeader">
              <div>
                <div className="panelEyebrow">Catalog</div>
                <h2 className="panelTitle">Sports in this season ({season.games.length})</h2>
              </div>
            </header>

            {season.games.length === 0 ? (
              <p style={{ color: "var(--bone-dim)", margin: 0 }}>
                No sports yet — add one below to make registration open for it.
              </p>
            ) : (
              <div className="gamesGrid">
                {season.games.map((g) => (
                  <article key={g.id} className={`gameTile ${g.slug}`}>
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
                  </article>
                ))}
              </div>
            )}

            <AddGameForm
              seasonId={season.id}
              availableGames={masterGames}
              attachedGameIds={attachedGameIds}
            />
          </section>
        </div>

        {/* ── Right rail — Visibility controls ── */}
        <ControlPanel
          seasonId={season.id}
          seasonName={season.name}
          isActive={season.isActive}
          registrationOpen={season.registrationOpen}
        />
      </div>
    </>
  );
}
