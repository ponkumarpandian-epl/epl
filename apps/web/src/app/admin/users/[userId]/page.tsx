import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/admin-users";
import { getCurrentUser } from "@/lib/auth";
import { RoleToggles } from "./role-toggles";
import "../users.css";

export const metadata: Metadata = { title: "User detail" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [user, me] = await Promise.all([getUser(userId), getCurrentUser()]);

  if (!user) {
    return (
      <div className="adminShell">
        <div className="emptyState">
          <h2>User not found</h2>
          <Link href="/admin/users" className="userSearchBtn">← Back to users</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="adminShell">
      <header className="adminHeader">
        <div>
          <div className="adminSubtitle">
            <Link href="/admin/users" className="captainBackLink">← Users</Link>
          </div>
          <h1 className="adminTitle">{user.fullName}</h1>
          <div className="userContactLine">
            {user.emailMasked || "—"} · {user.phoneMasked || "—"}
          </div>
        </div>
      </header>

      <section className="userDetailPanel">
        <h2 className="userPanelTitle">Roles</h2>
        <p className="userPanelHint">
          Admin and Umpire are granted here. Player is the signup default — removing it is rare.
        </p>
        <RoleToggles userId={user.id} initialRoles={user.roles} isSelf={me?.id === user.id} />
      </section>

      <section className="userDetailPanel">
        <h2 className="userPanelTitle">Captaincy</h2>
        {user.captainedTeams.length === 0 ? (
          <p className="userPanelHint">This user doesn&apos;t captain any team.</p>
        ) : (
          <ul className="captaincyList">
            {user.captainedTeams.map((t) => (
              <li key={t.teamId} className="captaincyRow">
                <div>
                  <span className={`roleBadge role-player`}>{t.sport}</span>
                  <span className="captaincyName">{t.teamName}</span>
                  {t.seasonLabel && <span className="captaincyMeta"> · {t.seasonLabel}</span>}
                </div>
                <Link href={`/captain/teams/${t.teamId}`} className="captaincyManageLink">
                  Manage / reassign →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
