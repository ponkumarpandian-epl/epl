import Link from "next/link";
import type { Metadata } from "next";
import { listUsers, ALL_ROLES } from "@/lib/admin-users";
import "./users.css";

export const metadata: Metadata = { title: "Users & Roles" };

interface SearchParams { q?: string; role?: string; page?: string }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp        = await searchParams;
  const q         = (sp.q ?? "").trim();
  const role      = ALL_ROLES.includes(sp.role as never) ? sp.role! : "";
  const page      = clampPage(sp.page);
  const data      = await listUsers(q, role, page);

  const roleHref = (r: string) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (r) next.set("role", r);
    return `/admin/users?${next.toString()}`;
  };

  return (
    <div className="adminShell">
      <header className="adminHeader">
        <div>
          <div className="adminSubtitle">Admin · Users &amp; Roles</div>
          <h1 className="adminTitle">Users</h1>
        </div>
        {data && (
          <div className="adminCount" aria-live="polite"><strong>{data.total}</strong> total</div>
        )}
      </header>

      <form className="userFilterBar" method="get" action="/admin/users">
        <input
          type="search" name="q" defaultValue={q}
          placeholder="Search by name, mobile or email…" className="userSearchInput"
          aria-label="Search users"
        />
        {role && <input type="hidden" name="role" value={role} />}
        <button type="submit" className="userSearchBtn">Search</button>
      </form>

      <div className="roleChips" aria-label="Filter by role">
        <Link href={roleHref("")} className={`roleChip ${role === "" ? "is-active" : ""}`}>All</Link>
        {ALL_ROLES.map((r) => (
          <Link key={r} href={roleHref(r)} className={`roleChip ${role === r ? "is-active" : ""}`}>{r}</Link>
        ))}
      </div>

      {!data ? (
        <div className="emptyState"><h2>Could not load users</h2><p>Try again in a moment.</p></div>
      ) : data.items.length === 0 ? (
        <div className="emptyState"><h2>No users match this filter.</h2><p>Clear the search or pick a different role.</p></div>
      ) : (
        <div className="tableWrap">
          <table className="adminTable">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Mobile</th><th>Roles</th></tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td data-label="Name" className="cellTeam">
                    <Link href={`/admin/users/${u.id}`} className="userNameLink">{u.fullName}</Link>
                  </td>
                  <td data-label="Email" className="cellMono cellMuted">{u.emailMasked || "—"}</td>
                  <td data-label="Mobile" className="cellMono cellMuted">{u.phoneMasked || "—"}</td>
                  <td data-label="Roles">
                    <span className="roleBadges">
                      {u.roles.length === 0 ? "—" : u.roles.map((r) => (
                        <span key={r} className={`roleBadge role-${r.toLowerCase()}`}>{r}</span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > data.pageSize && (
        <nav className="pagination" aria-label="Pagination">
          <span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={pageHref(q, role, page - 1)} aria-disabled={page <= 1}>← Prev</Link>
            <Link href={pageHref(q, role, page + 1)} aria-disabled={page >= Math.ceil(data.total / data.pageSize)}>Next →</Link>
          </div>
        </nav>
      )}
    </div>
  );
}

function clampPage(p: string | undefined) {
  const n = Number(p);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
function pageHref(q: string, role: string, p: number) {
  const next = new URLSearchParams();
  if (q) next.set("q", q);
  if (role) next.set("role", role);
  next.set("page", String(Math.max(1, p)));
  return `/admin/users?${next.toString()}`;
}
