import Link from "next/link";
import type { Metadata } from "next";
import { listAllSeasons, type SeasonDto } from "@/lib/seasons";
import "../admin.css";
import "./seasons.css";

export const metadata: Metadata = { title: "Seasons" };

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function formatRange(startIso?: string, endIso?: string): string {
  if (!startIso) return "Dates to be announced";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso);
}

export default async function AdminSeasonsPage() {
  const seasons = await listAllSeasons();
  const active  = seasons.find((s) => s.isActive);
  const others  = seasons.filter((s) => !s.isActive);

  return (
    <>
      <section className="adminHero">
        <div className="adminHeroInner">
          <div className="adminHeroTitleBlock">
            <span className="adminHeroEyebrow">Admin · Tournament Catalog</span>
            <h1 className="adminHeroTitle">Seasons</h1>
            <p className="adminHeroLead">
              Each season is a tournament edition with its own dates, sports, fees and coordinators.
              Set one season active — that&apos;s what the public home page shows.
            </p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin/seasons/new" className="adminBtn adminBtnPrimary">
              <PlusIcon /><span>New Season</span>
            </Link>
          </div>
        </div>
      </section>

      {seasons.length === 0 ? (
        <div className="emptySeasons">
          <h3>No seasons yet</h3>
          <p>Create the first one to start accepting team registrations.</p>
          <Link href="/admin/seasons/new" className="adminBtn adminBtnGold">
            <PlusIcon /><span>Create Season 1</span>
          </Link>
        </div>
      ) : (
        <div className="seasonGrid">
          {active && <SeasonCard season={active} />}
          {others.map((s) => <SeasonCard key={s.id} season={s} />)}
        </div>
      )}
    </>
  );
}

function SeasonCard({ season }: { season: SeasonDto }) {
  const contactCount = season.games.reduce((sum, g) => sum + g.contacts.length, 0);
  return (
    <Link
      href={`/admin/seasons/${season.id}`}
      className={`seasonCard ${season.isActive ? "is-active" : ""}`}
    >
      <div className="seasonCardInner">
        {season.isActive && (
          <div>
            <span className="seasonYearMonster" aria-hidden="true">{season.year}</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="seasonHeaderRow">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {season.tagline && <span className="seasonTagline">“{season.tagline}”</span>}
              <h2 className="seasonName">{season.name}</h2>
              <span className="seasonDates">{formatRange(season.startsOn, season.endsOn)}</span>
            </div>
            <div className="seasonPills">
              <span className={`statusPill ${season.isActive ? "is-active" : "is-inactive"}`}>
                {season.isActive ? "Active" : "Inactive"}
              </span>
              <span className={`statusPill ${season.registrationOpen ? "is-open" : "is-closed"}`}>
                {season.registrationOpen ? "Open" : "Closed"}
              </span>
            </div>
          </div>

          <div className="seasonStats">
            <div className="seasonStat">
              <span className="seasonStatValue">{season.games.length}</span>
              <span className="seasonStatLabel">Sports</span>
            </div>
            <div className="seasonStat">
              <span className="seasonStatValue">{contactCount}</span>
              <span className="seasonStatLabel">Coordinators</span>
            </div>
            <div className="seasonStat">
              <span className="seasonStatValue">
                {season.games.reduce((sum, g) => sum + g.entryFeeRupees, 0).toLocaleString("en-IN")}
              </span>
              <span className="seasonStatLabel">Total Fee ₹</span>
            </div>
          </div>

          <div className="seasonActions">
            <span className="adminBtn adminBtnGhost" style={{ pointerEvents: "none" }}>
              Manage <ArrowRightIcon />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

