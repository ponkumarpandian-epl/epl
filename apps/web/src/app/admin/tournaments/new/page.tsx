import type { Metadata } from "next";
import { listAllGames } from "@/lib/seasons";
import { NewTournamentForm } from "./new-tournament-form";
import "../../admin.css";
import "../admin-tournaments.css";

export const metadata: Metadata = { title: "New Tournament · Admin" };

export default async function NewTournamentPage() {
  const games = await listAllGames();
  // Only badminton today, but the form supports any active master Game so adding a new sport
  // later is just a row in the Games table — no code change.
  const activeGames = games.filter((g) => g.isActive);

  return (
    <>
      <section className="adminHero">
        <div className="adminHeroInner">
          <div className="adminHeroTitleBlock">
            <span className="adminHeroEyebrow">Admin · One-off events</span>
            <h1 className="adminHeroTitle">New Tournament</h1>
            <p className="adminHeroLead">
              Set up the basics now. You can attach categories below and tweak details on the next
              screen — nothing is visible to the public until you flip the publish switch.
            </p>
          </div>
        </div>
      </section>

      <NewTournamentForm games={activeGames} />
    </>
  );
}
