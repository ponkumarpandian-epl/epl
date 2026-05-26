import { FloatingBalls } from "@/components/home/floating-balls";
import { HeroBanner } from "@/components/home/hero-banner";
import { HomeIntro } from "@/components/home/home-intro";
import { SportCard, type Sport, type SportCardProps } from "@/components/home/sport-card";
import { ChampionBanner } from "@/components/home/champion-banner";
import { GallerySection } from "@/components/home/gallery-section";
import { SponsorsCta } from "@/components/home/sponsors-cta";
import { RegistrationClosedNotice } from "@/components/home/registration-closed-notice";
import { getCurrentSeason, type SeasonGameDto } from "@/lib/seasons";

// Map server SeasonGame → SportCardProps the home page already understands.
function toCardProps(sg: SeasonGameDto): SportCardProps {
  return {
    sport:            sg.slug as Sport,
    title:            sg.name,
    date:             <>{formatDateRange(sg.startsOn, sg.endsOn)}</>,
    pills:            [sg.venue, sg.categories].filter((p): p is string => Boolean(p)),
    feeRupees:        sg.entryFeeRupees,
    image:            sg.cardImageUrl || defaultImage(sg.slug as Sport),
    contacts:         sg.contacts.map((c) => ({
      name:         c.name,
      phoneDisplay: c.phoneDisplay,
      phoneE164:    c.phoneE164,
    })),
    seasonGameId:     sg.id,
    whatsAppGroupUrl: sg.whatsAppGroupUrl,
    registrationOpen: sg.registrationOpen,
  };
}

function defaultImage(slug: Sport): string {
  return slug === "cricket"   ? "/card-cricket.jpg"
       : slug === "badminton" ? "/card-badminton.jpg"
       :                        "/card-volleyball.jpg";
}

function formatDateRange(startIso?: string, endIso?: string): React.ReactNode {
  if (!startIso) return "Dates TBA";
  const start = new Date(startIso);
  if (!endIso) return formatSingle(start);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return formatSingle(start);
  // "13th & 14th June 2026" if same month, else "27 June – 4 July 2026"
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return (
      <>
        {ordinalize(start.getDate())} & {ordinalize(end.getDate())}{" "}
        {monthName(start)} {start.getFullYear()}
      </>
    );
  }
  return (
    <>
      {ordinalize(start.getDate())} {monthName(start)} – {ordinalize(end.getDate())} {monthName(end)} {end.getFullYear()}
    </>
  );
}
function formatSingle(d: Date) {
  return <>{ordinalize(d.getDate())} {monthName(d)} {d.getFullYear()}</>;
}
function ordinalize(n: number): React.ReactNode {
  const v = n % 100;
  const suffix = (v >= 11 && v <= 13) ? "th"
              : n % 10 === 1 ? "st"
              : n % 10 === 2 ? "nd"
              : n % 10 === 3 ? "rd"
              :                 "th";
  return <>{n}<sup>{suffix}</sup></>;
}
function monthName(d: Date) {
  return d.toLocaleString("en-GB", { month: "long" });
}

export default async function HomePage() {
  const season         = await getCurrentSeason();
  const seasonClosed   = season !== null && !season.registrationOpen;
  // When the season is closed, sport cards still render but each renders in
  // its "closed" state — the SportCard already handles per-card registrationOpen.
  // The season-level flag is the master override applied per card here.
  const cards = (season?.games ?? []).map((sg) => {
    const card = toCardProps(sg);
    return seasonClosed ? { ...card, registrationOpen: false } : card;
  });

  return (
    <>
      <FloatingBalls />
      <HeroBanner />
      <HomeIntro />

      {seasonClosed && <RegistrationClosedNotice seasonName={season!.name} />}

      {cards.length > 0 && (
        <div className="sports" id="sports">
          {cards.map((card) => (
            <SportCard key={card.seasonGameId ?? card.sport} {...card} />
          ))}
        </div>
      )}

      <ChampionBanner />
      <GallerySection />
      <SponsorsCta />
    </>
  );
}
