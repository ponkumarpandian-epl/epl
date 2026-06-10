import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import "./by-game/[slug]/teams-by-game.css";
import "./teams-hub.css";

export const metadata: Metadata = {
  title:       "Registered teams",
  description: "Browse the registered Cricket, Badminton, and Volleyball teams for the current EPL season.",
};

interface TeamPublicSummary {
  id: string;
  sport: "Cricket" | "Badminton" | "Volleyball";
  name: string;
  apartmentName: string;
  captainName: string;
}

const SPORTS = [
  { slug: "cricket",    label: "Cricket",    accent: "cricket",    eyebrow: "Red tennis ball · 8 overs"  },
  { slug: "badminton",  label: "Badminton",  accent: "badminton",  eyebrow: "Team format · doubles"      },
  { slug: "volleyball", label: "Volleyball", accent: "volleyball", eyebrow: "6-a-side · rally"           },
] as const;

/**
 * Hub for the team listings. Gated to authenticated Players (and Admins). The
 * nav link itself stays visible for anonymous visitors — they're redirected to
 * /login with this URL as `next` so they land back here after signing in.
 *
 * Counts come from the `/api/teams/by-game/{slug}` endpoint that also gates on
 * the same role, so a direct API hit can't bypass the page-level gate.
 */
export default async function TeamsHubPage() {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent("/teams")}`);
  const allowed = me.roles.includes("Player") || me.roles.includes("Admin");
  if (!allowed) redirect("/");

  const counts = await Promise.all(
    SPORTS.map(async (s) => {
      const res = await api.get<TeamPublicSummary[]>(`/api/teams/by-game/${s.slug}`);
      return { slug: s.slug, count: res.ok ? res.data.length : 0 };
    }),
  );
  const countBySlug = Object.fromEntries(counts.map((c) => [c.slug, c.count]));

  return (
    <div className="publicTeamsShell">
      <header className="publicTeamsHeader">
        <div className="publicTeamsEyebrow">EPL Season · Registered teams</div>
        <h1 className="publicTeamsTitle">Browse teams</h1>
        <p className="publicTeamsLead">
          Pick a sport to see every team that&apos;s signed up. Click a team to view
          its details — you&apos;ll be asked to sign in first.
        </p>
      </header>

      <ul className="teamsHubGrid" aria-label="Sports">
        {SPORTS.map((s) => {
          const count = countBySlug[s.slug] ?? 0;
          return (
            <li key={s.slug} className={`teamsHubCard ${s.accent}Accent`}>
              <Link href={`/teams/by-game/${s.slug}`} className="teamsHubLink">
                <span className="teamsHubEyebrow">{s.eyebrow}</span>
                <h2 className="teamsHubName">{s.label}</h2>
                <span className="teamsHubCount">
                  {count === 0
                    ? "No teams yet"
                    : <><strong>{count}</strong> {count === 1 ? "team" : "teams"} registered</>}
                </span>
                <span className="teamsHubArrow" aria-hidden="true">→</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
