import { getCurrentSeason } from "@/lib/seasons";
import { Topbar } from "./topbar";
import "./home.css";

const DEFAULT_TAGLINE = "Pride of E-City";

/**
 * Render a tagline with the first word in cyan and the last word in gold.
 * "Pride of E-City"   → <cyan>Pride</cyan> of <gold>E-City</gold>
 * "Champions Rise"    → <cyan>Champions</cyan> <gold>Rise</gold>
 * "Glory"             → <gold>Glory</gold>
 */
function renderTagline(text: string): React.ReactNode {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return <span className="accentGold">{parts[0]}</span>;

  const first  = parts[0];
  const last   = parts[parts.length - 1];
  const middle = parts.slice(1, -1).join(" ");
  return (
    <>
      <span className="accentCyan">{first}</span>
      {middle ? <> {middle} </> : " "}
      <span className="accentGold">{last}</span>
    </>
  );
}

export async function HeroBanner() {
  const season  = await getCurrentSeason();
  const tagline = (season?.tagline?.trim()) || DEFAULT_TAGLINE;

  return (
    <section className="heroWrap" aria-label="EPL hero">
      <Topbar />
      <div className="hero">
        <div className="heroCollage" aria-hidden="true" />
        <div className="heroContent">
          <h1 className="heroTitle">
            <span className="line">{renderTagline(tagline)}</span>
          </h1>
        </div>

        <div className="heroTicker" aria-hidden="true">
          <div className="heroTickerTrack">
            <TickerCopy />
            <TickerCopy />
          </div>
        </div>
      </div>
    </section>
  );
}

function TickerCopy() {
  return (
    <>
      <span><span className="label">Live Updates:</span> Registrations Closing Soon for Cricket</span>
      <span className="sep">|</span>
      <span>Volleyball Spots Filling Fast</span>
      <span className="sep">|</span>
      <span><span className="label">Badminton:</span> Women&apos;s Doubles New This Season</span>
      <span className="sep">|</span>
    </>
  );
}
