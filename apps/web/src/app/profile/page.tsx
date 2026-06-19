import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { getMyProfile } from "@/lib/profile";
import { getMyTeams } from "@/lib/captain";
import { listAllGames } from "@/lib/seasons";
import { ProfileEditor } from "./profile-editor";
import { MyTeamsList } from "./my-teams";
import "../admin/admin.css";
import "../captain/captain.css";
import "./profile.css";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  await requireAuth("/login");
  const [profile, games, myTeams] = await Promise.all([getMyProfile(), listAllGames(), getMyTeams()]);

  if (!profile) {
    return (
      <div className="profileShell">
        <section className="skillPanel">
          <h1 className="skillPanelTitle">Profile unavailable</h1>
          <p className="skillPanelLead">We couldn&apos;t load your profile right now. Try refreshing.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="profileShell">
      <ProfileEditor
        profile={profile}
        games={games.filter((g) => g.isActive).map((g) => ({ id: g.id, name: g.name, slug: g.slug }))}
      />
      <MyTeamsList teams={myTeams} />
    </div>
  );
}
