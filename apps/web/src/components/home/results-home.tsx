import Image from "next/image";
import type { CSSProperties } from "react";
import {
  overallPlacements,
  sportPodiums,
  standings,
  type PlacementTone,
} from "@/lib/standings";
import "./results-home.css";

const champion = overallPlacements[0];
const runnersUp = overallPlacements.slice(1);

function TrophyIcon({ tone = "gold" }: { tone?: PlacementTone }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 7h20v10c0 7-4.4 12-10 12s-10-5-10-12V7Z" fill="currentColor" />
      <path d="M14 11H8v4c0 5 3.2 8 8 8M34 11h6v4c0 5-3.2 8-8 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 29v7M17 41h14M19 36h10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="m24 11 1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5L24 11Z" className={`rh-trophy-star rh-${tone}`} />
    </svg>
  );
}

function Medal({ rank, tone }: { rank: number; tone: PlacementTone }) {
  return (
    <span className={`rh-medal rh-medal-${tone}`} aria-label={`Rank ${rank}`}>
      <svg viewBox="0 0 42 48" aria-hidden="true">
        <path d="M8 2h10l5 15-10 4L8 2Zm26 0H24l-5 15 10 4 5-19Z" className="rh-medal-ribbon" />
        <circle cx="21" cy="30" r="14" fill="currentColor" />
        <circle cx="21" cy="30" r="10.5" className="rh-medal-inset" />
      </svg>
      <strong>{rank}</strong>
    </span>
  );
}

const sportArtwork: Record<string, string> = {
  Cricket: "/card-cricket.jpg",
  Badminton: "/card-badminton.jpg",
  Volleyball: "/card-volleyball.jpg",
};

export function ResultsHome() {
  return (
    <div className="rh-page">
      <section className="rh-hero" aria-labelledby="season-result-title">
        <div className="rh-hero-glow" aria-hidden="true" />
        <div className="rh-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <i key={index} style={{ "--piece": index } as CSSProperties} />
          ))}
        </div>

        <div className="rh-hero-copy">
          <p className="rh-eyebrow"><span /> EPL Season 2 · Official results</p>
          <p className="rh-season-settled">The season is settled</p>
          <h1 id="season-result-title">
            <span>GM Infinite</span>
            <span className="rh-gold-word">E-City Town</span>
          </h1>
          <div className="rh-champion-label">
            <span className="rh-trophy"><TrophyIcon /></span>
            <div>
              <strong>Overall Champions</strong>
              <small>Electronic-City Premier League · 2026</small>
            </div>
          </div>
          <p className="rh-hero-lead">
            Three sports. Fifteen communities. One unforgettable finish. GM Infinite E-City Town
            takes the Season 2 crown after a title race that went down to the final tie-break.
          </p>
          <div className="rh-hero-stats" aria-label="Champion statistics">
            <span><strong>{champion.points}</strong> points</span>
            <span><strong>{champion.gold}</strong> sport title</span>
            <span><strong>#1</strong> of 15</span>
          </div>
          <a className="rh-scroll-link" href="#standings">
            Explore the final table
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
          </a>
        </div>

        <figure className="rh-champion-visual">
          <div className="rh-photo-kicker">Crowned in Electronic City</div>
          <div className="rh-photo-frame">
            <Image
              src={champion.image}
              alt="GM Infinite E-City Town celebrating as EPL Season 2 overall champions"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          </div>
          <span className="rh-year-mark" aria-hidden="true">2026</span>
        </figure>
      </section>

      <section className="rh-finalists" aria-labelledby="final-podium-title" id="results">
        <div className="rh-section-heading rh-section-heading-compact">
          <div>
            <p className="rh-eyebrow"><span /> The final podium</p>
            <h2 id="final-podium-title">A finish for the history books.</h2>
          </div>
          <p>
            The top two finished level on <strong>890 points</strong>. GM Infinite claimed the crown
            with a sport title in hand—the decisive gold-medal tie-break.
          </p>
        </div>

        <div className="rh-finalist-grid">
          {runnersUp.map((placement) => (
            <article className={`rh-finalist-card rh-${placement.tone}`} key={placement.rank}>
              <div className="rh-finalist-image">
                <Image
                  src={placement.image}
                  alt={`${placement.team}, EPL Season 2 ${placement.title.toLowerCase()}`}
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                />
                <div className="rh-finalist-overlay" aria-hidden="true" />
              </div>
              <div className="rh-finalist-body">
                <Medal rank={placement.rank} tone={placement.tone} />
                <div>
                  <span>{placement.title}</span>
                  <h3>{placement.team}</h3>
                </div>
                <dl>
                  <div><dt>Points</dt><dd>{placement.points}</dd></div>
                  <div><dt>Gold</dt><dd>{placement.gold}</dd></div>
                  <div><dt>Silver</dt><dd>{placement.silver}</dd></div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rh-season-strip" aria-label="Season 2 at a glance">
        <p>Season 2 in numbers</p>
        <div><strong>15</strong><span>Communities</span></div>
        <i aria-hidden="true" />
        <div><strong>3</strong><span>Sports</span></div>
        <i aria-hidden="true" />
        <div><strong>1</strong><span>Champion</span></div>
        <i aria-hidden="true" />
        <div><strong>890</strong><span>Winning points</span></div>
      </section>

      <section className="rh-sport-results" aria-labelledby="sport-results-title">
        <div className="rh-section-heading">
          <div>
            <p className="rh-eyebrow"><span /> Three battlegrounds</p>
            <h2 id="sport-results-title">Every title. Every contender.</h2>
          </div>
          <p>Cricket grit, badminton precision and volleyball power shaped the race for the overall crown.</p>
        </div>

        <div className="rh-sport-grid">
          {sportPodiums.map((podium) => (
            <article className={`rh-sport-card rh-sport-${podium.sport.toLowerCase()}`} key={podium.sport}>
              <header>
                <span className="rh-sport-icon" aria-hidden="true">
                  <Image
                    src={sportArtwork[podium.sport]}
                    alt=""
                    fill
                    sizes="64px"
                  />
                  <i />
                </span>
                <div><small>Season 2</small><h3>{podium.sport}</h3></div>
                <b>320</b>
              </header>
              <ol>
                <li><span>1</span><div><small>Champion</small><strong>{podium.champion}</strong></div><b>320</b></li>
                <li><span>2</span><div><small>Runner-up</small><strong>{podium.runnerUp}</strong></div><b>240</b></li>
                <li><span>SF</span><div><small>Semi-finalists</small><strong>{podium.semiFinalists}</strong></div><b>160</b></li>
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="rh-standings" id="standings" aria-labelledby="standings-title">
        <div className="rh-section-heading">
          <div>
            <p className="rh-eyebrow"><span /> After all three games</p>
            <h2 id="standings-title">Overall point standings.</h2>
          </div>
          <p>Final classification across Cricket, Badminton and Volleyball, including participation and season bonus points.</p>
        </div>

        <div className="rh-table-scroll" role="region" aria-label="Final standings table; scroll horizontally to see all columns" tabIndex={0}>
          <table>
            <caption className="sr-only">EPL Season 2 final overall point standings</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Community</th>
                <th scope="col" className="rh-col-cricket">Cricket</th>
                <th scope="col" className="rh-col-badminton">Badminton</th>
                <th scope="col" className="rh-col-volleyball">Volleyball</th>
                <th scope="col">Participation</th>
                <th scope="col">Bonus</th>
                <th scope="col">Total</th>
                <th scope="col">Gold</th>
                <th scope="col">Silver</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => {
                const tone = standing.rank === 1 ? "gold" : standing.rank === 2 ? "silver" : "bronze";
                return (
                  <tr key={`${standing.rank}-${standing.team}`} className={standing.rank <= 3 ? `rh-top-three rh-row-${tone}` : undefined}>
                    <td>
                      {standing.rank <= 3
                        ? <Medal rank={standing.rank} tone={tone} />
                        : <span className="rh-plain-rank">{String(standing.rank).padStart(2, "0")}</span>}
                    </td>
                    <th scope="row">{standing.team}</th>
                    <td className="rh-col-cricket">{standing.cricket}</td>
                    <td className="rh-col-badminton">{standing.badminton}</td>
                    <td className="rh-col-volleyball">{standing.volleyball}</td>
                    <td>{standing.participation}</td>
                    <td>{standing.bonus}</td>
                    <td className="rh-total">{standing.total}</td>
                    <td><span className={standing.gold ? "rh-count rh-count-gold" : "rh-count"}>{standing.gold}</span></td>
                    <td><span className={standing.silver ? "rh-count rh-count-silver" : "rh-count"}>{standing.silver}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rh-table-foot">
          <p><span className="rh-legend-dot rh-legend-gold" /> Gold — sport won <span className="rh-legend-dot rh-legend-silver" /> Silver — runner-up</p>
          <p>Winner 320 · Runner-up 240 · Semi-finalist 160 · Participation 50 pts</p>
        </div>
      </section>

      <section className="rh-closing" id="season-finale" aria-labelledby="closing-title">
        <div className="rh-closing-copy">
          <p className="rh-eyebrow"><span /> The final frame</p>
          <h2 id="closing-title">Three podiums.<br />One season to remember.</h2>
          <p>To every player, organiser, volunteer and community that brought the energy—this finish belongs to all of Electronic City.</p>
          <div className="rh-hashtags">#ChampionsCrowned <span>#EPL2026</span> #RaceToTheTop</div>
        </div>
        <div className="rh-mini-podium" aria-label="Top three overall finishers">
          {[overallPlacements[1], overallPlacements[0], overallPlacements[2]].map((placement) => (
            <a
              href={placement.image}
              target="_blank"
              rel="noopener noreferrer"
              className={`rh-mini-place rh-mini-${placement.tone}`}
              key={placement.rank}
              aria-label={`Open full ${placement.title} collage for ${placement.team}`}
            >
              <span>{placement.rank}</span>
              <strong>{placement.shortTeam}</strong>
              <small>{placement.title}</small>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
