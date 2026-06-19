import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { getTeamRoster, getRosterChanges } from "@/lib/captain";
import { RosterManager } from "./roster-manager";
import "../../captain.css";

export const metadata: Metadata = { title: "Manage roster · Captain" };

export default async function CaptainTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  await requireAuth("/login");
  const { teamId } = await params;
  const [roster, changes] = await Promise.all([getTeamRoster(teamId), getRosterChanges(teamId)]);

  if (!roster) {
    return (
      <div className="captainShell">
        <div className="captainEmpty">
          <h2>Roster unavailable</h2>
          <p>This team doesn&apos;t exist, or you&apos;re not its captain. Only the captain (or an admin) can manage a roster.</p>
          <Link href="/captain" className="captainPrimaryBtn">Back to my teams</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="captainShell">
      <header className="captainHeader">
        <div>
          <div className="captainEyebrow">
            <Link href="/captain" className="captainBackLink">← My teams</Link>
          </div>
          <h1 className="captainTitle">
            <span className={`sportTag ${roster.sport.toLowerCase()}`}>{roster.sport}</span> {roster.name}
          </h1>
          <div className="captainSubline">
            {roster.apartmentName}{roster.seasonName ? ` · ${roster.seasonName}` : ""}
          </div>
        </div>
      </header>

      <RosterManager teamId={teamId} initialRoster={roster} />

      {changes.length > 0 && (
        <section className="rosterAudit">
          <h2 className="rosterAuditTitle">Recent roster changes</h2>
          <ul className="rosterAuditList">
            {changes.map((c, i) => (
              <li key={`${c.userId}-${i}`} className={`rosterAuditItem is-${c.action}`}>
                <span className="rosterAuditName">
                  {c.fullName}{c.isCaptain && <span className="captainBadge" title="Captain">C</span>}
                </span>
                <span className="rosterAuditAction">{c.action}</span>
                <time className="rosterAuditTime">{formatWhen(c.at)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
