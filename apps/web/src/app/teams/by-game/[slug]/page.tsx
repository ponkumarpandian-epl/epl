import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import "./teams-by-game.css";

interface TeamPublicSummary {
  id:            string;
  sport:         "Cricket" | "Badminton" | "Volleyball";
  name:          string;
  apartmentName: string;
  captainName:   string;
}

const SPORT_LABEL: Record<string, string> = {
  cricket:    "Cricket",
  badminton:  "Badminton",
  volleyball: "Volleyball",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = SPORT_LABEL[slug.toLowerCase()];
  return {
    title:       label ? `${label} teams` : "Teams",
    description: label
      ? `All registered ${label} teams for the current EPL season — team, apartment, and captain.`
      : "All registered EPL teams.",
  };
}

/**
 * Per-sport teams listing — simple 3-column grid (Team · Apartment · Captain).
 * Gated to Players + Admins; anonymous visitors are bounced to /login with
 * this URL pinned to `next` so they land here after signing in. Only Active
 * teams come back from the API.
 */
export default async function PublicTeamsByGamePage({ params }: PageProps) {
  const { slug } = await params;
  const slugLower = slug.toLowerCase();
  const label = SPORT_LABEL[slugLower];
  if (!label) notFound();

  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/teams/by-game/${slugLower}`)}`);
  const allowed = me.roles.includes("Player") || me.roles.includes("Admin");
  if (!allowed) redirect("/");

  const res = await api.get<TeamPublicSummary[]>(`/api/teams/by-game/${encodeURIComponent(slugLower)}`);
  const teams = res.ok ? res.data : [];

  return (
    <div className="publicTeamsShell">
      <header className="publicTeamsHeader">
        <h1 className="publicTeamsTitle">{label} teams</h1>
      </header>

      <nav className="publicTeamsTabs" aria-label="Sports">
        <Link
          href="/teams/by-game/cricket"
          aria-current={slugLower === "cricket" ? "page" : undefined}
          className={slugLower === "cricket" ? "is-active" : ""}
        >Cricket</Link>
        <Link
          href="/teams/by-game/badminton"
          aria-current={slugLower === "badminton" ? "page" : undefined}
          className={slugLower === "badminton" ? "is-active" : ""}
        >Badminton</Link>
        <Link
          href="/teams/by-game/volleyball"
          aria-current={slugLower === "volleyball" ? "page" : undefined}
          className={slugLower === "volleyball" ? "is-active" : ""}
        >Volleyball</Link>
      </nav>

      <p className="publicTeamsLead">
        {teams.length === 0
          ? <>No teams registered yet for {label}.</>
          : <><strong>{teams.length}</strong> {teams.length === 1 ? "team" : "teams"} registered.</>}
      </p>

      {teams.length > 0 && (
        <div className="publicTeamsGrid" role="table" aria-label={`${label} teams`}>
          <div className="publicTeamsRow publicTeamsHead" role="row">
            <span role="columnheader">Team</span>
            <span role="columnheader">Apartment</span>
            <span role="columnheader">Captain</span>
          </div>
          {teams.map((t) => (
            <div key={t.id} className="publicTeamsRow" role="row">
              <span role="cell" data-label="Team"      className="publicTeamsCellTeam">{t.name}</span>
              <span role="cell" data-label="Apartment" className="publicTeamsCellApt">{t.apartmentName}</span>
              <span role="cell" data-label="Captain"   className="publicTeamsCellCap">{t.captainName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
