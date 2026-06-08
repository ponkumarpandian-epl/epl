import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FORMAT_LABEL,
  getTournamentBySlug,
  listCategoryEntries,
  type CategoryFormat,
  type TournamentCategoryDto,
  type TournamentDetailDto,
} from "@/lib/tournaments";
import { getPublicBracketByParent } from "@/lib/brackets";
import { BracketView } from "@/components/bracket/bracket-view";
import "../tournaments.css";

interface PageProps {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; registered?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTournamentBySlug(slug);
  if (!t) return {};
  return {
    title:       t.name,
    description: t.tagline ?? t.description?.slice(0, 160),
  };
}

function fmtDateRange(startIso?: string, endIso?: string): string {
  if (!startIso) return "Dates TBA";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso);
}

function fmtFee(rupees: number) {
  return rupees === 0 ? "Free entry" : "₹" + rupees.toLocaleString("en-IN");
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}

function canRegister(t: TournamentDetailDto, c: TournamentCategoryDto): { ok: boolean; reason?: string } {
  if (!t.registrationOpen)   return { ok: false, reason: "Registration is closed for the whole tournament." };
  if (!c.registrationOpen)   return { ok: false, reason: `${FORMAT_LABEL[c.format]} is not accepting entries.` };
  if (c.totalEntries >= c.maxEntries) return { ok: false, reason: `${FORMAT_LABEL[c.format]} is full (${c.maxEntries} entries).` };
  if (t.registrationDeadline && new Date(t.registrationDeadline) < new Date())
    return { ok: false, reason: "The registration deadline has passed." };
  return { ok: true };
}

export default async function TournamentDetailPage({ params, searchParams }: PageProps) {
  const { slug }     = await params;
  const { category, registered } = await searchParams;

  const t = await getTournamentBySlug(slug);
  if (!t) notFound();

  // Pick which category tab is active: query param wins; otherwise the first category by Format order.
  const activeFormat = (category as CategoryFormat | undefined) ?? t.categories[0]?.format;
  const active = t.categories.find((c) => c.format === activeFormat) ?? t.categories[0];

  const entries = active ? await listCategoryEntries(slug, active.id) : [];
  const gate    = active ? canRegister(t, active) : { ok: false };
  const bracket = active ? await getPublicBracketByParent("TournamentCategory", active.id) : null;

  return (
    <div className="tournDetailShell">
      <Link href="/tournaments" className="tournDetailBack">
        <BackIcon /> All tournaments
      </Link>

      <header className="tournDetailHeader">
        <div className="tournDetailEyebrow">
          {t.gameName.toUpperCase()} · {t.status === "Open" ? "Registration open" : t.status === "InProgress" ? "Live now" : t.status === "Completed" ? "Completed" : "Upcoming"}
        </div>
        <h1 className="tournDetailTitle">{t.name}</h1>
        <div className="tournDetailMeta">
          <span>📅 <b>{fmtDateRange(t.startsOn, t.endsOn)}</b></span>
          {t.venue && <span>📍 <b>{t.venue}</b></span>}
          <span>💸 <b>{fmtFee(t.entryFeeRupees)}</b></span>
          {t.registrationDeadline && (
            <span>⏳ Closes <b>{new Date(t.registrationDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</b></span>
          )}
        </div>
        {t.tagline && <p className="tournDetailLead">{t.tagline}</p>}
      </header>

      {t.categories.length === 0 ? (
        <section className="tournEmpty" role="status" style={{ marginTop: 0 }}>
          <h2 className="tournEmptyTitle">Categories coming soon</h2>
          <p className="tournEmptyLead">
            The organisers haven&apos;t finalised which formats they&apos;ll run yet. Check back closer to the
            registration deadline.
          </p>
        </section>
      ) : (
        <>
          {/* Category tabs — deep-linked via ?category= */}
          <div className="tournDetailTabs" role="tablist" aria-label="Tournament categories">
            {t.categories.map((c) => (
              <Link
                key={c.id}
                href={`/tournaments/${t.slug}?category=${c.format}`}
                className={c.format === active?.format ? "is-active" : ""}
                role="tab"
                aria-selected={c.format === active?.format}
              >
                {FORMAT_LABEL[c.format]}
              </Link>
            ))}
          </div>

          {active && bracket && (
            <section className="tournBracketSection" aria-label={`${FORMAT_LABEL[active.format]} bracket`}>
              <header className="tournBracketHeader">
                <h2>Bracket · {FORMAT_LABEL[active.format]}</h2>
                <span className="tournBracketEyebrow">Knockout</span>
              </header>
              <BracketView bracket={bracket} />
            </section>
          )}

          {active && (
            <section className="tournCategoryPanel" aria-label={`${FORMAT_LABEL[active.format]} details`}>
              <div>
                <span className="tournCategoryStats">
                  <b>{FORMAT_LABEL[active.format]}</b>
                  Spots: <strong style={{ color: "var(--bone)" }}>{active.totalEntries} / {active.maxEntries}</strong> filled
                  {" · "}
                  Minimum to run: <strong style={{ color: "var(--bone)" }}>{active.minEntries}</strong>
                  {" · "}
                  {active.playersPerEntry === 1 ? "1 player per entry" : "2 players per entry"}
                  {" · "}
                  Entry fee: <strong style={{ color: "var(--gold-bright)" }}>{fmtFee(active.entryFeeRupees > 0 ? active.entryFeeRupees : t.entryFeeRupees)}</strong>
                </span>

                {registered === "1" && (
                  <div className="tournCategoryHint" style={{ borderColor: "rgba(52, 211, 153, 0.5)", background: "rgba(52, 211, 153, 0.08)", color: "var(--bone)" }} role="status">
                    ✓ You&apos;re registered. The organisers will reach out on WhatsApp once entries are confirmed.
                  </div>
                )}

                {entries.length > 0 ? (
                  <div className="tournEntryList" aria-label={`Entries in ${FORMAT_LABEL[active.format]}`}>
                    <h3 className="tournEntryListTitle">Entries so far</h3>
                    <ul>
                      {entries.map((e) => (
                        <li key={e.id} className={`tournEntryRow tournEntryRow-${e.status.toLowerCase()}`}>
                          <span className="tournEntryNames">
                            {e.player1Name}{e.player2Name ? <> &nbsp;/&nbsp; {e.player2Name}</> : null}
                            {e.teamLabel && <span className="tournEntryTeam">&nbsp;· {e.teamLabel}</span>}
                          </span>
                          <span className="tournEntryStatus">{e.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="tournEntryEmpty">No entries yet — be the first to register.</p>
                )}
              </div>

              <div>
                {gate.ok ? (
                  <Link
                    href={`/tournaments/${t.slug}/register?category=${active.format}`}
                    className="tournRegisterBtn"
                    aria-label={`Register for ${FORMAT_LABEL[active.format]}`}
                  >
                    Register for {FORMAT_LABEL[active.format]} →
                  </Link>
                ) : (
                  <div
                    className="tournCategoryHint"
                    style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", color: "var(--bone-fade)" }}
                    role="status"
                  >
                    {gate.reason ?? "Registration is not available right now."}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
