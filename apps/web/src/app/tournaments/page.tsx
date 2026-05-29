import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  FORMAT_LABEL,
  listPublishedTournaments,
  type TournamentSummaryDto,
} from "@/lib/tournaments";
import "./tournaments.css";

export const metadata: Metadata = {
  title: "Tournaments",
  description:
    "Stand-alone badminton tournaments hosted around Electronic City, Bengaluru. Browse upcoming events, register your singles or doubles entry, and follow the draws.",
};

const STATUS_LABEL: Record<TournamentSummaryDto["status"], string> = {
  Draft:      "Draft",
  Upcoming:   "Upcoming",
  Open:       "Registration open",
  InProgress: "Live now",
  Completed:  "Completed",
};

const STATUS_TONE: Record<TournamentSummaryDto["status"], string> = {
  Draft:      "tournChip-draft",
  Upcoming:   "tournChip-upcoming",
  Open:       "tournChip-open",
  InProgress: "tournChip-live",
  Completed:  "tournChip-done",
};

function fmtMoney(rupees: number) {
  if (rupees === 0) return "Free entry";
  return "₹" + rupees.toLocaleString("en-IN") + " / entry";
}

function fmtDateRange(startIso?: string, endIso?: string): string {
  if (!startIso) return "Dates TBA";
  const start = new Date(startIso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (!endIso) return start.toLocaleDateString("en-IN", { ...opts, year: "numeric" });
  const end = new Date(endIso);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", { ...opts, year: "numeric" })}`;
}

function ctaFor(status: TournamentSummaryDto["status"]) {
  switch (status) {
    case "Open":       return { label: "Details",   ghost: false };
    case "InProgress": return { label: "Live draws", ghost: false };
    case "Completed":  return { label: "Results",   ghost: true  };
    default:           return { label: "Details",   ghost: true  };
  }
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

export default async function TournamentsHubPage() {
  const all = await listPublishedTournaments();

  // Order the cards by status priority so "Open" surfaces above "Completed".
  const order: Record<TournamentSummaryDto["status"], number> = {
    Open: 0, InProgress: 1, Upcoming: 2, Completed: 3, Draft: 4,
  };
  const items = [...all].sort((a, b) => order[a.status] - order[b.status]);

  const buckets = {
    open:       items.filter((t) => t.status === "Open").length,
    live:       items.filter((t) => t.status === "InProgress").length,
    upcoming:   items.filter((t) => t.status === "Upcoming").length,
    completed:  items.filter((t) => t.status === "Completed").length,
  };

  return (
    <div className="tournShell">
      <section className="tournHero">
        <span className="tournHeroEyebrow">Outside the EPL season · Badminton</span>
        <h1 className="tournHeroTitle">
          <span className="accentCyan">Tournaments</span>
        </h1>
        <p className="tournHeroLead">
          Stand-alone badminton events around Electronic City. Singles, Men&apos;s Doubles, Women&apos;s
          Doubles, Mixed — register your entry, follow the draws.
        </p>

        <div className="tournHeroStats" aria-label="Tournament counts">
          <span><b>{buckets.open}</b> open</span>
          <span><b>{buckets.live}</b> live</span>
          <span><b>{buckets.upcoming}</b> upcoming</span>
          <span><b>{buckets.completed}</b> completed</span>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="tournEmpty" role="status">
          <div className="tournEmptyIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h2 className="tournEmptyTitle">No tournaments scheduled yet</h2>
          <p className="tournEmptyLead">
            We&apos;re lining up the next set of weekend opens. Join the EPL community
            (button at the bottom-right) so you don&apos;t miss the announcement.
          </p>
        </section>
      ) : (
        <section className="tournGrid" aria-label="Tournament cards">
          {items.map((t) => {
            const cta = ctaFor(t.status);
            return (
              <article key={t.id} className={`tournCard tournCard-${t.status.toLowerCase()}`}>
                <Link href={`/tournaments/${t.slug}`} className="tournCardLink" aria-label={`${t.name} details`}>
                  <div className="tournCardBanner" aria-hidden="true">
                    {t.bannerImageUrl ? (
                      <Image
                        src={t.bannerImageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span className="tournCardBannerSport">{t.gameName.toUpperCase()}</span>
                    )}
                    <span className={`tournChip ${STATUS_TONE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                  </div>

                  <div className="tournCardBody">
                    <h3 className="tournCardName">{t.name}</h3>
                    <div className="tournCardMeta">
                      <span>{fmtDateRange(t.startsOn, t.endsOn)}</span>
                      {t.venue && <>
                        <span aria-hidden="true">·</span>
                        <span className="tournCardVenue" title={t.venue}>{t.venue}</span>
                      </>}
                    </div>

                    <ul className="tournCardCats" aria-label="Categories">
                      {t.categories.slice(0, 4).map((c) => (
                        <li key={c.id} className="tournCardCat">{FORMAT_LABEL[c.format]}</li>
                      ))}
                      {t.categories.length > 4 && <li className="tournCardCat tournCardCat-more">+{t.categories.length - 4}</li>}
                    </ul>

                    <div className="tournCardFoot">
                      <span className="tournCardFee">{fmtMoney(t.entryFeeRupees)}</span>
                      <span className={`tournCardCta ${cta.ghost ? "is-ghost" : ""}`}>
                        {cta.label} <ArrowRightIcon />
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
