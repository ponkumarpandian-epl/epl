import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FORMAT_LABEL,
  getTournamentBySlug,
  type CategoryFormat,
} from "@/lib/tournaments";
import "../tournaments.css";

interface PageProps {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
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

export default async function TournamentDetailPage({ params, searchParams }: PageProps) {
  const { slug }     = await params;
  const { category } = await searchParams;

  const t = await getTournamentBySlug(slug);
  if (!t) notFound();

  // Pick which category tab is active: query param wins; otherwise the first category by Format order.
  const activeFormat = (category as CategoryFormat | undefined) ?? t.categories[0]?.format;
  const active = t.categories.find((c) => c.format === activeFormat) ?? t.categories[0];

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

          {active && (
            <section className="tournCategoryPanel" aria-label={`${FORMAT_LABEL[active.format]} details`}>
              <div>
                <span className="tournCategoryStats">
                  <b>{FORMAT_LABEL[active.format]}</b>
                  Spots: <strong style={{ color: "var(--bone)" }}>{active.maxEntries}</strong>
                  {" · "}
                  Minimum to run: <strong style={{ color: "var(--bone)" }}>{active.minEntries}</strong>
                  {" · "}
                  {active.playersPerEntry === 1 ? "1 player per entry" : "2 players per entry"}
                  {" · "}
                  Entry fee: <strong style={{ color: "var(--gold-bright)" }}>{fmtFee(active.entryFeeRupees > 0 ? active.entryFeeRupees : t.entryFeeRupees)}</strong>
                </span>

                <div className="tournCategoryHint">
                  Registration UI &amp; live entry list ship in the next iteration. For now, the
                  category is set up and ready for the registration form when it lands.
                </div>
              </div>

              <div>
                {!active.registrationOpen || !t.registrationOpen ? (
                  <div className="tournCategoryHint" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", color: "var(--bone-fade)" }}>
                    Registration is currently <b style={{ color: "var(--bone)" }}>closed</b> for this category.
                  </div>
                ) : (
                  <div className="tournCategoryHint">
                    Registration window: <b style={{ color: "var(--bone)" }}>open</b>. The form arrives in iteration T-2.
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
