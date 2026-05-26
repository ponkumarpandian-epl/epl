import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { getMyProfile } from "@/lib/profile";
import { listAllGames } from "@/lib/seasons";
import { ProfileEditor } from "./profile-editor";
import "../admin/admin.css";
import "./profile.css";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  await requireAuth("/login");
  const [profile, games] = await Promise.all([getMyProfile(), listAllGames()]);

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
    </div>
  );
}
