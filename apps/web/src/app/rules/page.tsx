import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentSeason, type SeasonGameDto, type SportName } from "@/lib/seasons";
import "./rules.css";

export const metadata: Metadata = {
  title:       "Rules & Regulations",
  description: "Official EPL Season 2 tournament rules for Cricket, Badminton, and Volleyball, plus shared eligibility and conduct rules.",
};

type Tab = "cricket" | "badminton" | "volleyball" | "common";

/** Maps a tab key to its SportName for SeasonGame lookup (Sport enum is serialised
 *  as PascalCase by JsonStringEnumConverter; we also fall back to matching by slug
 *  in case the enum ever serialises as a number).
 */
const SPORT_FOR_TAB: Record<Exclude<Tab, "common">, SportName> = {
  cricket:    "Cricket",
  badminton:  "Badminton",
  volleyball: "Volleyball",
};

const TABS: { key: Tab; label: string; eyebrow: string }[] = [
  { key: "cricket",    label: "Cricket",      eyebrow: "Red tennis ball" },
  { key: "badminton",  label: "Badminton",    eyebrow: "Team format · doubles" },
  { key: "volleyball", label: "Volleyball",   eyebrow: "6-a-side · rally" },
  { key: "common",     label: "Common Rules", eyebrow: "Applies to every sport" },
];

interface PageProps {
  searchParams: Promise<{ sport?: string }>;
}

// ── Date / money / range helpers ─────────────────────────────────────────
function fmtDateRange(start?: string, end?: string): string {
  if (!start) return "Dates to be announced";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}
function fmtRupees(amount: number) {
  return "₹" + amount.toLocaleString("en-IN") + " / team";
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function Section({
  id, title, defaultOpen, children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} className="rulesSection" {...(defaultOpen ? { open: true } : {})}>
      <summary>
        <span className="rulesSectionTitle">{title}</span>
        <span className="rulesSectionChev"><ChevronIcon /></span>
      </summary>
      <div className="rulesSectionBody">{children}</div>
    </details>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rulesFact">
      <span className="rulesFactLabel">{label}</span>
      <span className="rulesFactValue">{value}</span>
    </div>
  );
}

function CommonRef() {
  return (
    <p className="rulesCommonRef">
      Eligibility, conduct, inter-apartment, awards and match-day protocol rules apply to every sport — see the{" "}
      <Link href="/rules?sport=common">Common Rules</Link> tab.
    </p>
  );
}

/**
 * Renders the at-a-glance facts strip purely from the SeasonGame row served by
 * the API. No hardcoded fallbacks — what you see is what's in the database. If
 * the admin hasn't populated a field, its card just doesn't render.
 *
 * Derived fields:
 *   - Reporting time = sg.startsOn − 1 hour (computed)
 *   - Reg. closes    = sg.startsOn − 7 days (computed)
 *   - Register link  = internal /teams/register?sport=…&seasonGameId=…
 */
function SportFactGrid({ sg, seasonRegOpen }: { sg: SeasonGameDto | null; seasonRegOpen: boolean }) {
  if (!sg) {
    return (
      <div className="rulesFactGrid">
        <p style={{ gridColumn: "1 / -1", color: "var(--bone-fade)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em" }}>
          This sport isn&apos;t scheduled in the current season yet — details will appear here once an admin
          adds it to the active season.
        </p>
      </div>
    );
  }

  const dates  = sg.startsOn ? fmtDateRange(sg.startsOn, sg.endsOn) : null;
  const venue  = sg.venue?.trim() || null;
  const fee    = sg.entryFeeRupees > 0 ? fmtRupees(sg.entryFeeRupees) : null;
  const format = sg.formatNote?.trim() || null;
  const squad  = sg.squadNote?.trim()  || null;

  // Reporting time — startsOn − 1 hour, formatted as time-of-day. Only renders when
  // the start time has a meaningful hour (not stored as midnight, which is the
  // "we don't know the time yet" placeholder).
  const reporting = computeReportingTime(sg.startsOn);

  // Registration close date — startsOn − 7 days.
  const deadline = computeRegistrationCloseDate(sg.startsOn);

  // Always the app's internal registration route — never the external form.
  const registerHref = `/teams/register?sport=${sg.slug}&seasonGameId=${sg.id}`;
  const registerOpen = sg.registrationOpen && seasonRegOpen;

  return (
    <div className="rulesFactGrid">
      {dates  && <Fact label="Dates"   value={dates} />}
      {venue  && <Fact label="Venue"   value={venue} />}
      {format && <Fact label="Format"  value={format} />}
      {fee    && <Fact label="Entry"   value={fee} />}
      {squad  && <Fact label="Squad"   value={squad} />}
      {reporting && <Fact label="Reporting"   value={reporting} />}
      {deadline  && <Fact label="Reg. closes" value={deadline} />}
      <RegisterCta open={registerOpen} href={registerHref} />
    </div>
  );
}

/** Primary CTA — replaces a plain Fact for the register slot so the action
 *  reads like a button, not a tucked-away link. Sport-tinted via parent
 *  .rulesPanel-{sport} accent (see rules.css). */
function RegisterCta({ open, href }: { open: boolean; href: string }) {
  if (!open) {
    return (
      <div className="rulesFact rulesFactRegister is-closed" aria-disabled="true">
        <span className="rulesFactLabel">Register</span>
        <span className="rulesFactValue">
          <span className="registerCtaText">Closed</span>
        </span>
      </div>
    );
  }
  return (
    <Link href={href} className="rulesFact rulesFactRegister is-open" aria-label="Register your team for this sport">
      <span className="rulesFactLabel">Register</span>
      <span className="rulesFactValue">
        <span className="registerCtaText">Register your team</span>
        <span className="registerCtaArrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </span>
    </Link>
  );
}

/** Eyebrow line above the sport title — reads sg.hashtag from the API only. */
function sportEyebrow(sportLabel: string, season: { name?: string } | null, sg: SeasonGameDto | null): string {
  const seasonLabel = season?.name?.trim() || "Season";
  const tag         = sg?.hashtag?.trim();
  return tag
    ? `EPL ${sportLabel} · ${seasonLabel} · ${tag}`
    : `EPL ${sportLabel} · ${seasonLabel}`;
}

/** Returns "8:00 AM"-style time-of-day for (startsOn − 1 h), or null if startsOn
 *  is missing or stored as midnight (treated as "time not set"). */
function computeReportingTime(startsOnIso: string | undefined): string | null {
  if (!startsOnIso) return null;
  const start = new Date(startsOnIso);
  if (start.getHours() === 0 && start.getMinutes() === 0) return null; // midnight = unset
  const reporting = new Date(start.getTime() - 60 * 60 * 1000);
  return reporting.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Returns "6 Jun 2026"-style date for (startsOn − 7 days), or null if missing. */
function computeRegistrationCloseDate(startsOnIso: string | undefined): string | null {
  if (!startsOnIso) return null;
  const start    = new Date(startsOnIso);
  const deadline = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
  return deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Per-sport panels ─────────────────────────────────────────────────────

function CricketPanel({ sg, season, seasonRegOpen }: { sg: SeasonGameDto | null; season: { name?: string } | null; seasonRegOpen: boolean }) {
  return (
    <>
      <header className="rulesPanelHeader cricketAccent">
        <div className="rulesPanelEyebrow">{sportEyebrow("Cricket", season, sg)}</div>
        <h2 className="rulesPanelTitle">Cricket</h2>
        <SportFactGrid sg={sg} seasonRegOpen={seasonRegOpen} />
      </header>

      <CommonRef />

      <Section id="cricket-format" title="Tournament format" defaultOpen>
        <ul>
          <li>Red tennis ball cricket — bring your own kit.</li>
          <li>New ball provided for every innings.</li>
          <li>Each team can register up to 15 players.</li>
          <li><strong>Impact Player rule</strong> applies.</li>
        </ul>
      </Section>

      <Section id="cricket-league" title="League stage" defaultOpen>
        <ul>
          <li><strong>10 overs</strong> per innings.</li>
          <li>First <strong>3 overs</strong> mandatory powerplay.</li>
          <li>Maximum <strong>2 overs</strong> per bowler.</li>
        </ul>
      </Section>

      <Section id="cricket-knockout" title="Semi-finals &amp; Finals" defaultOpen>
        <ul>
          <li><strong>12 overs</strong> per innings (subject to schedule).</li>
          <li>First <strong>4 overs</strong> powerplay.</li>
          <li>Maximum <strong>2 overs</strong> per bowler — except <strong>two designated bowlers</strong> may bowl up to <strong>3 overs</strong>.</li>
        </ul>
      </Section>

      <Section id="cricket-match-rules" title="Match rules" defaultOpen>
        <ul>
          <li>Standard cricket rules apply, with two exceptions:
            <ul>
              <li><strong>No LBW.</strong></li>
              <li><strong>No leg byes.</strong></li>
            </ul>
          </li>
          <li>Wide ball — 1 extra run.</li>
          <li>Overthrows count as additional runs.</li>
          <li><strong>One shoulder-height bouncer</strong> allowed per over.</li>
          <li>No-ball: overstepping, waist-high full toss, chucking after warning, or a second bouncer in the same over.</li>
          <li>No ball — 1 extra run, next delivery is a <strong>free hit</strong>.</li>
        </ul>
      </Section>

      <Section id="cricket-fielding" title="Fielding restrictions">
        <ul>
          <li>During powerplay — maximum <strong>2 fielders</strong> outside the circle.</li>
          <li>During regular overs — minimum <strong>4 fielders</strong> inside the circle.</li>
        </ul>
      </Section>

      <Section id="cricket-time" title="Time rules">
        <ul>
          <li>League innings must finish within <strong>40 minutes</strong>.</li>
          <li>Semi-finals &amp; Finals innings must finish within <strong>50 minutes</strong>.</li>
          <li>Every additional 5-minute delay — <strong>+3 runs</strong> awarded to the batting side.</li>
          <li>Weather and unforeseen delays are excluded from the time count.</li>
        </ul>
      </Section>

      <Section id="cricket-retirement" title="Retirement rules">
        <ul>
          <li><strong>Retired Hurt</strong> — player bats only at the end of the lineup.</li>
          <li><strong>Retired Out</strong> — player cannot bat again.</li>
        </ul>
      </Section>

      <Section id="cricket-result" title="Result rules">
        <ul>
          <li>League stage ties — shared points.</li>
          <li>Knockout ties — decided by a <strong>Super Over</strong>.</li>
        </ul>
      </Section>
    </>
  );
}

function BadmintonPanel({ sg, season, seasonRegOpen }: { sg: SeasonGameDto | null; season: { name?: string } | null; seasonRegOpen: boolean }) {
  return (
    <>
      <header className="rulesPanelHeader badmintonAccent">
        <div className="rulesPanelEyebrow">{sportEyebrow("Badminton", season, sg)}</div>
        <h2 className="rulesPanelTitle">Badminton</h2>
        <SportFactGrid sg={sg} seasonRegOpen={seasonRegOpen} />
      </header>

      <CommonRef />

      <Section id="badminton-registration" title="Registration" defaultOpen>
        <ul>
          <li>Entry fee — <strong>₹6,000 per team</strong>.</li>
          <li>Registration deadline — <strong>7 Jun 2026</strong>.</li>
          <li>Minimum 6 teams, maximum 12 teams.</li>
          <li>Selection — <strong>First-Come-First-Served</strong>; only <strong>paid</strong> registrations are confirmed.</li>
          <li>No refunds once registration is confirmed.</li>
        </ul>
        <p className="rulesNote">
          <strong>Payment contacts:</strong> Deepak J · 96868 00057 · Nagaraj · 81978 01827 · Sathish · 72594 12307.
        </p>
      </Section>

      <Section id="badminton-team" title="Team format" defaultOpen>
        <ul>
          <li>Each team plays <strong>5 doubles encounters</strong>: 4 Men&apos;s Doubles + 1 Women&apos;s Doubles.</li>
          <li>Squad — minimum 10 players, maximum 13 (including 3 backups).</li>
        </ul>
      </Section>

      <Section id="badminton-tournament" title="Tournament format" defaultOpen>
        <ul>
          <li>Teams divided into <strong>Pool A and Pool B</strong> by random draw.</li>
          <li>Top 2 from each pool qualify for the semi-finals.</li>
          <li>Semi-finals — <strong>Pool A #1 vs Pool B #2</strong> and <strong>Pool B #1 vs Pool A #2</strong>.</li>
          <li>Winners advance to the Final.</li>
        </ul>
      </Section>

      <Section id="badminton-match-rules" title="Match rules" defaultOpen>
        <ul>
          <li>Match format — <strong>21 points (deuce till 30)</strong>.</li>
          <li>Regular doubles win — <strong>10 points</strong>.</li>
          <li><strong>Trump match</strong> win — <strong>20 points</strong>; loss — <strong>−10 points</strong>.</li>
          <li>League encounter — 4 regular doubles + 1 trump match.</li>
          <li>No trump matches in semi-finals or finals.</li>
          <li>Shuttlecock — <strong>Yonex Mavis 350</strong>.</li>
        </ul>
      </Section>

      <Section id="badminton-tiebreaker" title="Tie-breaker">
        <ul>
          <li>First — head-to-head result.</li>
          <li>If still tied — <strong>Supreme Doubles</strong>: best pair from each team plays a <strong>30 Golden Points</strong> shootout.</li>
        </ul>
      </Section>

      <Section id="badminton-other" title="Other important rules">
        <ul>
          <li><strong>Non-marking</strong> badminton shoes are mandatory.</li>
          <li>Matches start <strong>strictly on time</strong>.</li>
          <li>Umpire decisions are final — no arguments or misconduct.</li>
          <li>Lunch &amp; snacks provided for all participants.</li>
        </ul>
      </Section>
    </>
  );
}

function VolleyballPanel({ sg, season, seasonRegOpen }: { sg: SeasonGameDto | null; season: { name?: string } | null; seasonRegOpen: boolean }) {
  return (
    <>
      <header className="rulesPanelHeader volleyballAccent">
        <div className="rulesPanelEyebrow">{sportEyebrow("Volleyball", season, sg)}</div>
        <h2 className="rulesPanelTitle">Volleyball</h2>
        <SportFactGrid sg={sg} seasonRegOpen={seasonRegOpen} />
      </header>

      <CommonRef />

      <Section id="vb-format" title="Match format" defaultOpen>
        <ul>
          <li>League — <strong>1 set to 25 points</strong>, win by 2 (no cap).</li>
          <li>Semi-finals &amp; Final — <strong>best of three</strong>: Set 1 to 25, Set 2 to 25, decisive Set 3 to <strong>15</strong>. Win each by 2.</li>
          <li>Court switch — at 13 points in a league set, at 8 points in a decider.</li>
          <li>Libero role is <strong>not permitted</strong> — all six on-court players are regular.</li>
        </ul>
      </Section>

      <Section id="vb-team" title="Team composition" defaultOpen>
        <ul>
          <li>Squad of 12; six on court at any time.</li>
          <li>Each squad nominates one Captain. Only the Captain may address the referees on rule interpretation.</li>
          <li>Coach &amp; Assistant Coach allowed on the bench — must be registered.</li>
          <li>Identical uniforms; jersey numbers <strong>1 – 20</strong> on chest and back.</li>
          <li>No spiked shoes, no jewellery (medical tags allowed if taped).</li>
        </ul>
      </Section>

      <Section id="vb-play" title="Playing the ball">
        <ul>
          <li><strong>Maximum 3 contacts</strong> per side (block does not count).</li>
          <li>No double hit — exception: a single continuous action during the first team contact.</li>
          <li>Ball can touch any body part; must be hit, not caught.</li>
          <li>Ball must cross the net within the antennae. Net touch while crossing — in play.</li>
          <li>Reaching over the net — allowed only on the attack-hit follow-through.</li>
          <li>Foot/feet may break the centre line if some part remains on or above it.</li>
        </ul>
      </Section>

      <Section id="vb-service" title="Service, position &amp; rotation">
        <ul>
          <li>Server has <strong>8 seconds</strong> after the whistle. Only one toss allowed.</li>
          <li>Server must stay in the service zone; stepping on the end line is a fault.</li>
          <li>Net-touch on serve (let-serve) — in play.</li>
          <li>Rally point system. Receiving team that wins a rally <strong>rotates one position clockwise</strong> before serving.</li>
          <li>Positional fault — any player out of rotational position at the moment of service contact.</li>
        </ul>
      </Section>

      <Section id="vb-attack" title="Attack-hit &amp; block">
        <ul>
          <li>Back-row attack — must take off behind the attack line.</li>
          <li>Back-row players may not complete a block, nor attack a ball entirely above the net from the front zone.</li>
          <li>Block doesn&apos;t count as a contact; the first contact after a block can be by any player, including the blocker.</li>
          <li>Blocking the opponent&apos;s service — fault.</li>
        </ul>
      </Section>

      <Section id="vb-interruptions" title="Interruptions, time-outs &amp; substitutions">
        <ul>
          <li><strong>2 time-outs</strong> per set, <strong>30 seconds</strong> each.</li>
          <li>In Semi-finals &amp; Final, sets 1 and 2: <strong>two technical time-outs</strong> of 60 s when the leader reaches 8 and 16. None in the decider.</li>
          <li><strong>10 substitutions</strong> per set. A starter can be replaced and re-enter up to 5 times — only at their original position.</li>
          <li>Set intervals — <strong>3 minutes</strong>.</li>
          <li>Injury — up to <strong>3 minutes</strong> recovery; one exceptional 3-minute recovery per match if no substitution is possible.</li>
          <li>Delay — first instance is a warning. Subsequent delays cost the rally.</li>
        </ul>
      </Section>

      <Section id="vb-conduct" title="Conduct &amp; sanctions">
        <ul>
          <li><strong>Yellow card</strong> — warning, no penalty.</li>
          <li><strong>Red card</strong> — penalty: opponents win the rally.</li>
          <li><strong>Yellow + Red together</strong> — expulsion for the set.</li>
          <li><strong>Yellow + Red separately</strong> — disqualification for the match.</li>
          <li>Only the on-court Captain may address the referee or file a protest (on points of law only).</li>
        </ul>
      </Section>

      <Section id="vb-standings" title="League standings &amp; knockouts">
        <ul>
          <li>Win — 3 points · Loss — 0 · Walkover — 3 (recorded as 25–0).</li>
          <li>Tie-breakers, in order: matches won → set ratio → point ratio → head-to-head → 1-set tiebreaker (to 15).</li>
          <li>Knockout — top teams qualify (committee confirms count per season). Semi-finals &amp; Final are best-of-three (25 / 25 / 15).</li>
          <li>The Committee may schedule a 3rd-place playoff in the same format.</li>
        </ul>
      </Section>

      <Section id="vb-default" title="Default, forfeit &amp; eligibility">
        <ul>
          <li>10-minute grace at start time — beyond that the match is forfeited (set score 25–0 / 15–0).</li>
          <li>Withdrawal mid-tournament — remaining matches forfeited.</li>
          <li>A player who appears for a second team — that team forfeits every match the player participated in.</li>
          <li>Replacement players for medical reasons — allowed until the start of the knockout stage with Committee approval.</li>
        </ul>
      </Section>

      <Section id="vb-quickref" title="Quick reference card">
        <ul>
          <li><strong>Players on court:</strong> 6 · <strong>Squad:</strong> 12 · <strong>No libero.</strong></li>
          <li><strong>Max contacts:</strong> 3 (block not counted).</li>
          <li><strong>Time-outs:</strong> 2 × 30 s per set. <strong>Substitutions:</strong> 10 per set.</li>
          <li><strong>Set interval:</strong> 3 min.</li>
          <li><strong>Side switch:</strong> 13 pts (league set), 8 pts (decider).</li>
          <li><strong>Net heights:</strong> M 2.43 m · W 2.24 m · Mixed 2.35 m.</li>
          <li><strong>Cards:</strong> Yellow = warning · Red = penalty · Y+R together = expulsion · Y+R separately = disqualification.</li>
        </ul>
      </Section>
    </>
  );
}

function CommonPanel() {
  return (
    <>
      <header className="rulesPanelHeader commonAccent">
        <div className="rulesPanelEyebrow">EPL · All sports</div>
        <h2 className="rulesPanelTitle">Common Rules</h2>
        <p className="rulesPanelLead">
          These rules apply across Cricket, Badminton, and Volleyball. Each sport&apos;s own page covers only the
          sport-specific format, scoring and match rules — for eligibility, conduct, awards, and dispute
          resolution, this is the single source of truth.
        </p>
      </header>

      <Section id="common-eligibility" title="Player eligibility &amp; documents" defaultOpen>
        <ul>
          <li><strong>Minimum age</strong> — 22 years.</li>
          <li><strong>Accepted address proofs</strong> — Aadhaar Card, Flat Ownership Deed, Gas Bill (last 3 months), Passport. <strong>Rental agreements are not accepted.</strong></li>
          <li>Bring <strong>one photo proof</strong> and <strong>one address proof</strong> to the venue.</li>
          <li>Players must be registered with the Tournament Committee before the team&apos;s first match.</li>
          <li>If a player turns out for a second team, that team forfeits every match the player participated in.</li>
        </ul>
        <p className="rulesNote">
          <strong>Not eligible</strong> — coaches and medalled players in the sport.
        </p>
      </Section>

      <Section id="common-area" title="Eligible residential areas" defaultOpen>
        <p>
          Open to residents of Electronic City, Neeladri Road, Doddathogur, Neo Town, Tirupalaya Road,
          E-City Phase 2, Ananth Nagar, Daddys Layout, Jigani, Chandapura and the surrounding area.
        </p>
      </Section>

      <Section id="common-apartments" title="Inter-apartment team rules" defaultOpen>
        <ul>
          <li>Apartments with <strong>500 or more flats</strong> must form separate teams.</li>
          <li>Apartments with fewer than 500 flats <strong>can combine</strong> — up to <strong>4 apartments</strong> per team.</li>
          <li>Combined apartments must be within a <strong>1 km radius</strong> of each other.</li>
          <li>Individual houses cannot combine.</li>
        </ul>
      </Section>

      <Section id="common-protocol" title="Match-day protocol">
        <ul>
          <li>Teams must report at least <strong>15 – 30 minutes</strong> before their scheduled start.</li>
          <li>If the Captain &amp; Vice-Captain are absent at the toss, the team loses the toss.</li>
          <li>Late arrival may reduce overs / playing time. Beyond 10 – 15 minutes late may forfeit the match.</li>
        </ul>
      </Section>

      <Section id="common-conduct" title="Sportsmanship &amp; discipline">
        <ul>
          <li>Umpire / referee decisions are <strong>final</strong>.</li>
          <li>Only the <strong>Captain or Vice-Captain</strong> may discuss decisions or file a protest, and only on rule interpretation — not on factual judgements.</li>
          <li>First misconduct — yellow card / warning. Second — red card / penalty.</li>
          <li>Repeated misconduct may lead to expulsion or disqualification.</li>
          <li>Abusive behaviour by players, coaches, or spectators may lead to sanctions for the team.</li>
        </ul>
      </Section>

      <Section id="common-awards" title="Awards">
        <ul>
          <li>Winners Trophy.</li>
          <li>Runners-Up Trophy.</li>
          <li>Trophies for the main playing squad.</li>
          <li>Medals for substitutes / backups.</li>
          <li>Badminton additionally awards a <strong>Second Runners-Up</strong> trophy.</li>
        </ul>
      </Section>

      <Section id="common-protests" title="Protests &amp; appeals">
        <ul>
          <li>Only the on-court Captain may file a protest, and only on rule interpretation.</li>
          <li>The protest must be raised at the moment the incident occurs and before play resumes.</li>
          <li>The Tournament Committee&apos;s decision on protests is final.</li>
        </ul>
      </Section>

      <Section id="common-amend" title="Spirit, amendments &amp; final authority">
        <ul>
          <li>Maintain sportsmanship and respect at all times.</li>
          <li>The Tournament Committee reserves the right to amend, supplement or clarify these rules at any time before or during the tournament.</li>
          <li>Amendments will be communicated in writing to all Captains and take effect from the time notified.</li>
          <li>In all matters not expressly provided for, the decision of the Tournament Committee shall be final and binding.</li>
        </ul>
      </Section>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function RulesPage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const active = (TABS.find((t) => t.key === sp.sport)?.key) ?? "cricket";

  // Pull the live SeasonGame rows so the facts strip (Dates / Venue / Fee /
  // Format / Squad / Register link / Reporting / Deadline / Hashtag) renders
  // from API data rather than hardcoded strings. Admin edits flow straight here.
  const season         = await getCurrentSeason();
  const seasonRegOpen  = season?.registrationOpen ?? false;
  const sgFor  = (tab: Tab): SeasonGameDto | null => {
    if (tab === "common") return null;
    return (
      // Slug match is robust to enum serialisation quirks; sport-name match is
      // the canonical path. First hit wins.
      season?.games.find((g) => g.slug === tab) ??
      season?.games.find((g) => g.sport === SPORT_FOR_TAB[tab]) ??
      null
    );
  };

  return (
    <div className="rulesShell">
      <section className="rulesHero">
        <span className="rulesHeroEyebrow">Season 2 · 2026</span>
        <h1 className="rulesHeroTitle"><span className="accentGold">Rules</span> &amp; Regulations</h1>
        <p className="rulesHeroLead">
          Tournament rule books for each sport, plus the eligibility, conduct, and awards rules that
          apply across the league. Pick a sport below — every section is collapsible, so scan only what
          you need.
        </p>
      </section>

      <nav className="rulesTabs" aria-label="Rule book navigation">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/rules?sport=${t.key}`}
            className={`rulesTab rulesTab-${t.key} ${active === t.key ? "is-active" : ""}`}
            aria-current={active === t.key ? "page" : undefined}
            scroll={false}
          >
            <span className="rulesTabLabel">{t.label}</span>
            <span className="rulesTabEyebrow">{t.eyebrow}</span>
          </Link>
        ))}
      </nav>

      <main className={`rulesPanel rulesPanel-${active}`}>
        {active === "cricket"    && <CricketPanel    sg={sgFor("cricket")}    season={season} seasonRegOpen={seasonRegOpen} />}
        {active === "badminton"  && <BadmintonPanel  sg={sgFor("badminton")}  season={season} seasonRegOpen={seasonRegOpen} />}
        {active === "volleyball" && <VolleyballPanel sg={sgFor("volleyball")} season={season} seasonRegOpen={seasonRegOpen} />}
        {active === "common"     && <CommonPanel />}
      </main>

      <footer className="rulesFootnote">
        <p>
          Issued by the Tournament Committee · Season 2 (2026). Rules may be amended before or during the
          tournament — Captains will be notified in writing.
        </p>
        <p>
          Questions? Pick a coordinator from the{" "}
          <Link href="/contact">Contact page</Link> or join the EPL WhatsApp community
          {" "}(the green button at the bottom-right of every page).
        </p>
      </footer>
    </div>
  );
}
