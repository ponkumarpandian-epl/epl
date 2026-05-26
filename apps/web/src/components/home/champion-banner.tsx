import "./home.css";

export function ChampionBanner() {
  return (
    <section className="championBanner" aria-label="Overall Champion">
      <div className="championTrophy" aria-hidden="true">
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="trophyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD15C" />
              <stop offset="100%" stopColor="#A87800" />
            </linearGradient>
          </defs>
          <path d="M9 4h14v6c0 4.5-3 8-7 8s-7-3.5-7-8V4z" fill="url(#trophyGrad)" stroke="#7a5a18" strokeWidth="0.6" />
          <path d="M9 6c-2 0-4 1-4 3s2 3 4 3"  fill="none" stroke="url(#trophyGrad)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M23 6c2 0 4 1 4 3s-2 3-4 3" fill="none" stroke="url(#trophyGrad)" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="14" y="18" width="4"  height="5"   fill="url(#trophyGrad)" />
          <rect x="10" y="23" width="12" height="2.5" rx="1" fill="url(#trophyGrad)" />
          <rect x="8"  y="25.5" width="16" height="3"  rx="1" fill="url(#trophyGrad)" stroke="#7a5a18" strokeWidth="0.4" />
          <path d="M16 9l1 2 2 0.3-1.5 1.4 0.4 2L16 13.7l-1.9 1L14.5 12.7 13 11.3l2-0.3z" fill="#fff" opacity="0.7" />
        </svg>
      </div>
      <div className="championText">
        <div className="championTitle">Overall Champion</div>
        <p className="championBody">
          Register for <strong>all three</strong> tournaments and your apartment is automatically in the running for the{" "}
          <strong>EPL Season 2 (2026) Overall Championship</strong> — awarded to the team with the highest combined points
          across Cricket, Badminton, and Volleyball.
        </p>
      </div>
    </section>
  );
}
