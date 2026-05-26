import type { Metadata } from "next";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the EPL Season 2 (2026) tournament team — Cricket, Badminton, Volleyball.",
};

interface Contact { name: string; phoneDisplay: string; phoneE164: string; }
interface SportCard { sport: "cricket" | "badminton" | "volleyball"; title: string; people: Contact[] }

const SPORT_CONTACTS: SportCard[] = [
  {
    sport: "cricket",
    title: "Cricket",
    people: [
      { name: "Christo",  phoneDisplay: "97902 42834", phoneE164: "+919790242834" },
      { name: "Nagaraj",  phoneDisplay: "81978 01827", phoneE164: "+918197801827" },
      { name: "Ponkumar", phoneDisplay: "95913 37122", phoneE164: "+919591337122" },
    ],
  },
  {
    sport: "badminton",
    title: "Badminton",
    people: [
      { name: "Deepak J", phoneDisplay: "96868 00057", phoneE164: "+919686800057" },
      { name: "Sathish",  phoneDisplay: "72594 12307", phoneE164: "+917259412307" },
    ],
  },
  {
    sport: "volleyball",
    title: "Volleyball",
    people: [
      { name: "Abdul",   phoneDisplay: "94481 80435", phoneE164: "+919448180435" },
      { name: "Roopesh", phoneDisplay: "95660 62356", phoneE164: "+919566062356" },
    ],
  },
];

function MailIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function HandshakeIcon(){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 17l-2 2a2 2 0 0 1-3-3l5-5a2 2 0 0 1 3 0l5 5a2 2 0 0 1-3 3l-2-2"/><path d="M14 7l-3-3-5 5"/></svg>; }
function PhoneIcon()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function ArrowIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17l10-10M7 7h10v10"/></svg>; }
function PinIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function ClockIcon()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function PhoneIconSm() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function WaIconSm()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2A10 10 0 0 0 3.04 16.41L2 22l5.69-1.04A10 10 0 1 0 12 2zm5.42 14.4c-.23.64-1.36 1.22-1.87 1.27-.5.05-.97.21-3.27-.69-2.78-1.08-4.55-3.89-4.69-4.08-.13-.18-1.13-1.5-1.13-2.86 0-1.36.72-2.03.97-2.31.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.07.62.47.23.55.79 1.91.86 2.05.07.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.43.49-.14.13-.29.28-.13.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.22 2.19 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.13.45.2.52.31.07.11.07.64-.16 1.27z"/></svg>; }

function initial(s: string) { return s.trim().charAt(0).toUpperCase(); }
function waUrl(e164: string) { return `https://wa.me/${e164.replace(/^\+/, "")}`; }

export default function ContactPage() {
  return (
    <div className="contactShell">
      {/* ── Hero ── */}
      <section className="contactHero">
        <div className="contactHeroEyebrow">Get in touch</div>
        <h1 className="contactHeroTitle">
          <span className="accentCyan">Talk</span> to the <span className="accentGold">EPL Team</span>
        </h1>
        <p className="contactHeroLead">
          Questions about <strong>registration</strong>, <strong>sponsorship</strong>, or <strong>match-day logistics</strong>?
          We&apos;re a quick message away — pick whichever channel works for you.
        </p>
      </section>

      {/* ── Primary CTA quick cards ── */}
      <section className="contactQuickGrid" aria-label="Quick contact options">
        <a
          className="contactQuickCard gold"
          href="mailto:info.ecitypremierleague@gmail.com?subject=EPL%20Inquiry"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="contactQuickIcon"><MailIcon /></div>
          <span className="contactQuickLabel">General · Email</span>
          <h3 className="contactQuickTitle">Drop us a note</h3>
          <span className="contactQuickValue">info.ecitypremierleague@gmail.com</span>
          <span className="contactQuickArrow"><ArrowIcon /></span>
        </a>

        <a
          className="contactQuickCard cyan"
          href={`mailto:info.ecitypremierleague@gmail.com?subject=${encodeURIComponent("Become a Sponsor — EPL Season 2 (2026)")}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="contactQuickIcon"><HandshakeIcon /></div>
          <span className="contactQuickLabel">Partnerships · Sponsor</span>
          <h3 className="contactQuickTitle">Become a sponsor</h3>
          <span className="contactQuickValue">Brand a sport. Brand the league.</span>
          <span className="contactQuickArrow"><ArrowIcon /></span>
        </a>

        <article className="contactQuickCard crimson">
          <div className="contactQuickIcon"><PhoneIcon /></div>
          <span className="contactQuickLabel">Coordinators · Call / WhatsApp</span>
          <div className="contactQuickPeople">
            <div className="contactQuickPerson">
              <span className="contactQuickPersonText">
                <span className="contactQuickPersonName">Ponkumar</span>
                <span className="contactQuickPersonPhone">+91 95913 37122</span>
              </span>
              <span className="contactActions">
                <a href="tel:+919591337122" className="contactIconBtn contactIconBtn--call" aria-label="Call Ponkumar"><PhoneIconSm /></a>
                <a href={waUrl("+919591337122")} target="_blank" rel="noopener noreferrer" className="contactIconBtn contactIconBtn--wa" aria-label="WhatsApp Ponkumar"><WaIconSm /></a>
              </span>
            </div>
            <div className="contactQuickPerson">
              <span className="contactQuickPersonText">
                <span className="contactQuickPersonName">Deepak</span>
                <span className="contactQuickPersonPhone">+91 96868 00057</span>
              </span>
              <span className="contactActions">
                <a href="tel:+919686800057" className="contactIconBtn contactIconBtn--call" aria-label="Call Deepak"><PhoneIconSm /></a>
                <a href={waUrl("+919686800057")} target="_blank" rel="noopener noreferrer" className="contactIconBtn contactIconBtn--wa" aria-label="WhatsApp Deepak"><WaIconSm /></a>
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* ── Sport coordinators ── */}
      <section className="contactSection" aria-label="Sport coordinators">
        <header className="contactSectionHeader">
          <div>
            <span className="contactSectionEyebrow">Sport coordinators</span>
            <h2 className="contactSectionTitle">Reach the right captain</h2>
          </div>
        </header>
        <div className="contactSportGrid">
          {SPORT_CONTACTS.map((s) => (
            <article key={s.sport} className={`contactSportCard ${s.sport}`}>
              <h3 className="contactSportName">{s.title}</h3>
              <div className="contactSportContacts">
                {s.people.map((p) => (
                  <div key={p.phoneE164} className="contactPerson">
                    <span className="contactPersonAvatar" aria-hidden="true">{initial(p.name)}</span>
                    <span className="contactPersonText">
                      <span className="contactPersonName">{p.name}</span>
                      <span className="contactPersonPhone">{p.phoneDisplay}</span>
                    </span>
                    <span className="contactActions">
                      <a href={`tel:${p.phoneE164}`} className="contactIconBtn contactIconBtn--call" aria-label={`Call ${p.name}`}><PhoneIconSm /></a>
                      <a href={waUrl(p.phoneE164)} target="_blank" rel="noopener noreferrer" className="contactIconBtn contactIconBtn--wa" aria-label={`WhatsApp ${p.name}`}><WaIconSm /></a>
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Venue & timings ── */}
      <section className="contactSection" aria-label="Venue and timings">
        <header className="contactSectionHeader">
          <div>
            <span className="contactSectionEyebrow">Logistics</span>
            <h2 className="contactSectionTitle">Where &amp; when</h2>
          </div>
        </header>
        <div className="contactInfo">
          <div className="contactInfoCard">
            <span className="contactInfoIcon"><PinIcon /></span>
            <div className="contactInfoBody">
              <span className="contactInfoLabel">Primary Venue</span>
              <span className="contactInfoValue">JMR Cricket Ground, EC Phase 1, Bengaluru</span>
            </div>
          </div>
          <div className="contactInfoCard">
            <span className="contactInfoIcon"><ClockIcon /></span>
            <div className="contactInfoBody">
              <span className="contactInfoLabel">Season 2 Window</span>
              <span className="contactInfoValue">13 – 28 June 2026</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
