import { getCurrentSeason, getCurrentSeasonStats } from "@/lib/seasons";
import { buildTickerMessages, type TickerMessage } from "@/lib/ticker-messages";
import { Topbar } from "./topbar";
import "./home.css";

const DEFAULT_TAGLINE = "Pride of E-City";

function LockIcon() {
  return (
    <svg className="heroTickerLock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function TickerItemView({ msg }: { msg: TickerMessage }) {
  switch (msg.kind) {
    case "season-closed":
      return (
        <span className="heroTickerItem is-closed">
          <LockIcon />
          <span>{msg.text}</span>
        </span>
      );
    case "sport-closed":
      return (
        <span className="heroTickerItem is-closed">
          <LockIcon />
          <span>{msg.text}</span>
        </span>
      );
    case "sport-open":
      return (
        <span className="heroTickerItem is-open">
          <span>{msg.text}</span>
        </span>
      );
    case "sport-empty":
      return (
        <span className="heroTickerItem is-open">
          <span>{msg.text}</span>
        </span>
      );
    case "cta":
      return (
        <span className="heroTickerItem is-cta">
          <span>{msg.text}</span>
        </span>
      );
  }
}

function TickerCopy({ messages }: { messages: TickerMessage[] }) {
  return (
    <>
      {messages.map((m, i) => (
        <span key={`m-${i}`} style={{ display: "inline-flex", alignItems: "center" }}>
          <TickerItemView msg={m} />
          <span className="heroTickerSep" aria-hidden="true">●</span>
        </span>
      ))}
    </>
  );
}

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
  const [season, stats] = await Promise.all([
    getCurrentSeason(),
    getCurrentSeasonStats(),
  ]);
  const tagline  = (season?.tagline?.trim()) || DEFAULT_TAGLINE;
  const messages = buildTickerMessages(stats);

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
            <TickerCopy messages={messages} />
            <TickerCopy messages={messages} />
          </div>
        </div>
      </div>
    </section>
  );
}
