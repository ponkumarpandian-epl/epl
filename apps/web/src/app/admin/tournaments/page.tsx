import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  FORMAT_LABEL,
  listAllTournaments,
  type TournamentSummaryDto,
} from "@/lib/tournaments";
import "../admin.css";
import "./admin-tournaments.css";

export const metadata: Metadata = { title: "Tournaments · Admin" };

const STATUS_LABEL: Record<TournamentSummaryDto["status"], string> = {
  Draft:      "Draft",
  Upcoming:   "Upcoming",
  Open:       "Open",
  InProgress: "Live",
  Completed:  "Completed",
};

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function fmtDateRange(startIso?: string, endIso?: string): string {
  if (!startIso) return "Dates to be announced";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso);
}

export default async function AdminTournamentsPage() {
  const rows = await listAllTournaments();

  // Drafts first (admin's TODOs surface up), then by status priority.
  const order: Record<TournamentSummaryDto["status"], number> = {
    Draft: 0, Open: 1, InProgress: 2, Upcoming: 3, Completed: 4,
  };
  const items = [...rows].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <>
      <section className="adminHero">
        <div className="adminHeroInner">
          <div className="adminHeroTitleBlock">
            <span className="adminHeroEyebrow">Admin · One-off events</span>
            <h1 className="adminHeroTitle">Tournaments</h1>
            <p className="adminHeroLead">
              Stand-alone badminton events outside the EPL season — singles, men&apos;s/women&apos;s doubles, mixed.
              Drafts stay invisible to the public until you publish.
            </p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin/tournaments/new" className="adminBtn adminBtnPrimary">
              <PlusIcon /><span>New Tournament</span>
            </Link>
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="adminEmpty">
          <h3>No tournaments yet</h3>
          <p>Create the first one to start accepting entries when the bracket subsystem ships in T-3.</p>
          <Link href="/admin/tournaments/new" className="adminBtn adminBtnGold">
            <PlusIcon /><span>Create tournament</span>
          </Link>
        </div>
      ) : (
        <div className="adminTournList">
          {items.map((t) => (
            <Link key={t.id} href={`/admin/tournaments/${t.id}`} className={`adminTournRow adminTournRow-${t.status.toLowerCase()}`}>
              <div className="adminTournThumb" aria-hidden="true" style={{ position: "relative" }}>
                {t.bannerImageUrl
                  ? <Image src={t.bannerImageUrl} alt="" fill sizes="88px" style={{ objectFit: "cover" }} />
                  : <span>{t.gameName.charAt(0)}</span>}
              </div>
              <div className="adminTournBody">
                <h3 className="adminTournName">{t.name}</h3>
                <div className="adminTournMeta">
                  <span>{t.gameName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{fmtDateRange(t.startsOn, t.endsOn)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t.categoryCount} categor{t.categoryCount === 1 ? "y" : "ies"}</span>
                  {t.venue && <>
                    <span aria-hidden="true">·</span>
                    <span className="adminTournVenue" title={t.venue}>{t.venue}</span>
                  </>}
                </div>
                <div className="adminTournCats">
                  {t.categories.map((c) => (
                    <span key={c.id} className="adminTournCatChip">{FORMAT_LABEL[c.format]}</span>
                  ))}
                </div>
              </div>
              <div className="adminTournActions">
                <span className={`adminTournStatus adminTournStatus-${t.status.toLowerCase()}`}>
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="adminTournSlug">/{t.slug}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
