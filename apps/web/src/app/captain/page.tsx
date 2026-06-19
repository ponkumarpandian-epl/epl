import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { getCaptainTeams } from "@/lib/captain";
import "./captain.css";

export const metadata: Metadata = { title: "Captain · My teams" };

export default async function CaptainPage() {
  await requireAuth("/login");
  const teams = await getCaptainTeams();

  return (
    <div className="captainShell">
      <header className="captainHeader">
        <div>
          <div className="captainEyebrow">Captain</div>
          <h1 className="captainTitle">Teams you captain</h1>
        </div>
        <div className="captainCount" aria-live="polite">
          <strong>{teams.length}</strong> {teams.length === 1 ? "team" : "teams"}
        </div>
      </header>

      {teams.length === 0 ? (
        <div className="captainEmpty">
          <h2>You don&apos;t captain a team yet</h2>
          <p>
            When you register a team you become its captain and can build the roster here.
            Already registered a team? Ask an admin to attach your account as captain.
          </p>
          <Link href="/teams/register" className="captainPrimaryBtn">Register a team</Link>
        </div>
      ) : (
        <div className="captainGrid">
          {teams.map((t) => {
            const full = t.activeMemberCount >= t.maxRosterSize;
            return (
              <Link key={t.id} href={`/captain/teams/${t.id}`} className={`captainCard sport-${t.sport.toLowerCase()}`}>
                <div className="captainCardTop">
                  <span className={`sportTag ${t.sport.toLowerCase()}`}>{t.sport}</span>
                  {full && <span className="rosterFullChip">Full</span>}
                </div>
                <h2 className="captainCardName">{t.name}</h2>
                <div className="captainCardApt">{t.apartmentName}</div>
                {t.seasonName && <div className="captainCardSeason">{t.seasonName}</div>}
                <div className="captainCardRoster">
                  <strong>{t.activeMemberCount}</strong> / {t.maxRosterSize} players
                </div>
                <span className="captainCardCta">Manage roster →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
