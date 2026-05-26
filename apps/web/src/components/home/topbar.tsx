import "./home.css";

export function Topbar() {
  return (
    <div className="topbar" role="region" aria-label="Tournament metadata">
      <div className="topbarLeft">
        <span className="accent">EPL</span>
        <span className="sep">·</span>
        <span>Season 2</span>
        <span className="sep">·</span>
        <span>2026</span>
        <span className="sep">·</span>
        <span>Bengaluru</span>
      </div>
      <div className="topbarRight">3 Sports · 1 Champion</div>
    </div>
  );
}
