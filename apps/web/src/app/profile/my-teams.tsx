"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { MyTeam } from "@/lib/captain";
import { leaveTeamAction } from "./actions";

export function MyTeamsList({ teams: initial }: { teams: MyTeam[] }) {
  const [teams, setTeams] = useState<MyTeam[]>(initial);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function leave(t: MyTeam) {
    setError(null);
    const prev = teams;
    setTeams((list) => list.filter((x) => x.membershipId !== t.membershipId));   // optimistic
    setConfirmId(null);
    startTransition(async () => {
      const res = await leaveTeamAction(t.membershipId);
      if (!res.ok) { setTeams(prev); setError(res.message ?? "Could not leave the team."); }
    });
  }

  if (teams.length === 0) {
    return (
      <section className="myTeamsPanel">
        <h2 className="myTeamsTitle">My teams</h2>
        <p className="myTeamsEmpty">You&apos;re not on any team yet. A captain can add you once you&apos;ve registered.</p>
      </section>
    );
  }

  return (
    <section className="myTeamsPanel" aria-busy={pending}>
      <h2 className="myTeamsTitle">My teams</h2>
      {error && <p className="myTeamsError" role="alert">{error}</p>}
      <ul className="myTeamsList">
        {teams.map((t) => (
          <li key={t.membershipId} className="myTeamRow">
            <div className="myTeamMain">
              <span className={`sportTag ${t.sport.toLowerCase()}`}>{t.sport}</span>
              <div className="myTeamInfo">
                <Link href={`/teams/${t.teamId}`} className="myTeamName">
                  {t.name}
                  {t.isCaptain && <span className="captainBadge" title="You captain this team">C</span>}
                </Link>
                <div className="myTeamMeta">
                  {t.apartmentName}
                  {t.seasonName ? ` · ${t.seasonName}` : ""}
                  {!t.isCaptain && ` · Captain: ${t.captainName}`}
                </div>
              </div>
            </div>
            <div className="myTeamActions">
              {t.isCaptain ? (
                <Link href={`/captain/teams/${t.teamId}`} className="myTeamManageLink">Manage roster →</Link>
              ) : confirmId === t.membershipId ? (
                <span className="myTeamConfirm">
                  Leave {t.name}?
                  <button type="button" className="myTeamLeaveYes" onClick={() => leave(t)} disabled={pending}>Yes</button>
                  <button type="button" className="myTeamLeaveNo" onClick={() => setConfirmId(null)} disabled={pending}>No</button>
                </span>
              ) : (
                <button
                  type="button"
                  className="myTeamLeaveBtn"
                  onClick={() => setConfirmId(t.membershipId)}
                  disabled={pending}
                >
                  Leave
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
