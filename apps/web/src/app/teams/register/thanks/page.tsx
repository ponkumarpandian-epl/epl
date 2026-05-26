import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentSeason, type SeasonGameDto } from "@/lib/seasons";
import "./thanks.css";

export const metadata: Metadata = { title: "Team registered" };

function CheckIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2A10 10 0 0 0 3.04 16.41L2 22l5.69-1.04A10 10 0 1 0 12 2zm5.42 14.4c-.23.64-1.36 1.22-1.87 1.27-.5.05-.97.21-3.27-.69-2.78-1.08-4.55-3.89-4.69-4.08-.13-.18-1.13-1.5-1.13-2.86 0-1.36.72-2.03.97-2.31.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.07.62.47.23.55.79 1.91.86 2.05.07.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.43.49-.14.13-.29.28-.13.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.22 2.19 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.13.45.2.52.31.07.11.07.64-.16 1.27z"/>
    </svg>
  );
}

interface SearchParams { sport?: string; teamName?: string; }

export default async function TeamThanksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp        = await searchParams;
  const sportSlug = (sp.sport ?? "").toLowerCase();
  const teamName  = (sp.teamName ?? "").trim();

  // Resolve the WhatsApp link for the SeasonGame the user just registered for.
  const season: { games: SeasonGameDto[] } | null = await getCurrentSeason();
  const seasonGame = season?.games.find((g) => g.slug === sportSlug);
  const waUrl      = seasonGame?.whatsAppGroupUrl ?? null;
  const sportName  = seasonGame?.name ?? "your sport";

  return (
    <div className="thanksShell">
      {/* ── Hero — confirmation ── */}
      <section className="thanksHero">
        <div className="checkBadge" aria-hidden="true">
          <CheckIcon />
        </div>
        <div className="thanksEyebrow">Registration confirmed</div>
        <h1 className="thanksTitle">
          {teamName ? <>You&apos;re in, <span className="teamHighlight">{teamName}</span></> : <>You&apos;re in</>}
        </h1>
        <p className="thanksLead">
          We&apos;ve received your registration for <strong>{sportName}</strong>. Match-day fixtures,
          schedule updates, and last-minute changes all go out on the WhatsApp group below — please join.
        </p>
      </section>

      {/* ── Big prominent WhatsApp CTA ── */}
      {waUrl ? (
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="waCard">
          <span className="waCardIcon" aria-hidden="true"><WhatsAppIcon /></span>
          <div className="waCardBody">
            <span className="waCardEyebrow">Important · Join now</span>
            <h2 className="waCardTitle">{sportName} WhatsApp Group</h2>
            <p className="waCardHint">
              Tournament coordinators post here. You won&apos;t want to miss updates.
            </p>
          </div>
          <span className="waCardBtn">
            <WhatsAppIcon /> Join Group →
          </span>
        </a>
      ) : (
        <div className="waCard" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)" }}>
          <span className="waCardIcon" aria-hidden="true" style={{ filter: "grayscale(0.6) opacity(0.6)" }}><WhatsAppIcon /></span>
          <div className="waCardBody">
            <span className="waCardEyebrow" style={{ color: "var(--bone-fade)" }}>WhatsApp link pending</span>
            <h2 className="waCardTitle">Group link coming soon</h2>
            <p className="waCardHint">
              The coordinator will share the WhatsApp invite within 24 hours. Keep an eye on the captain&apos;s mobile.
            </p>
          </div>
          <span />
        </div>
      )}

      {/* ── Footer actions ── */}
      <div className="thanksFooter">
        <Link href="/" className="adminBtn adminBtnGhost" style={{ textDecoration: "none" }}>
          ← Back to home
        </Link>
        <Link href="/contact" className="adminBtn adminBtnGold" style={{ textDecoration: "none" }}>
          Contact organisers
        </Link>
      </div>
    </div>
  );
}
