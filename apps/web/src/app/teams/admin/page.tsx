import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { api } from "@/lib/api";
import { listAllSeasons } from "@/lib/seasons";
import { AdminFilterBar, type SeasonOption } from "./filter-bar";
import "./admin.css";

export const metadata: Metadata = { title: "Team registrations · Admin" };

type BackendSport = "Cricket" | "Badminton" | "Volleyball";

interface TeamRow {
  id:               string;
  sport:            BackendSport;
  name:             string;
  apartmentName:    string;
  apartmentAddress: string;
  apartmentLat:     number;
  apartmentLng:     number;
  captainName:      string;
  captainMobile:    string;
  seasonGameId:     string | null;
  seasonName:       string | null;
  createdAt:        string;
}
interface PagedResponse<T> { items: T[]; total: number; page: number; pageSize: number; }

interface SearchParams { sport?: string; search?: string; seasonId?: string; page?: string }

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("Admin");

  const [allSeasons, sp] = await Promise.all([listAllSeasons(), searchParams]);
  const sport     = normSport(sp.sport);
  const search    = (sp.search ?? "").trim();
  const seasonId  = (sp.seasonId ?? "").trim();
  const page      = clampPage(sp.page);
  const pageSize  = 20;

  const qs = new URLSearchParams();
  if (sport)    qs.set("sport", sport);
  if (search)   qs.set("search", search);
  if (seasonId) qs.set("seasonId", seasonId);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const res = await api.get<PagedResponse<TeamRow>>(`/api/teams?${qs}`);

  const seasonOptions: SeasonOption[] = allSeasons.map((s) => ({
    id: s.id, label: `${s.name} (${s.year})`, isActive: s.isActive,
  }));
  const selectedSeasonLabel = seasonOptions.find((s) => s.id === seasonId)?.label;

  if (!res.ok) {
    return (
      <div className="adminShell">
        <header className="adminHeader">
          <h1 className="adminTitle">Team registrations</h1>
        </header>
        <div className="emptyState">
          <h2>Could not load teams</h2>
          <p>{res.message}</p>
        </div>
      </div>
    );
  }

  const data = res.data;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  // Active filter chips (visible state for screen-readers + UX recall)
  const activeFilters: { key: string; label: string; clearTo: string }[] = [];
  function makeClearHref(without: string) {
    const next = new URLSearchParams(qs);
    next.delete(without);
    next.delete("page");
    return `/teams/admin?${next.toString()}`;
  }
  if (sport)              activeFilters.push({ key: "sport",    label: `Sport: ${sport}`,                  clearTo: makeClearHref("sport") });
  if (seasonId)           activeFilters.push({ key: "season",   label: `Season: ${selectedSeasonLabel ?? "(unknown)"}`, clearTo: makeClearHref("seasonId") });
  if (search)             activeFilters.push({ key: "search",   label: `Search: "${search}"`,              clearTo: makeClearHref("search") });

  return (
    <div className="adminShell">
      <header className="adminHeader">
        <div>
          <div className="adminSubtitle">Admin · Team Registrations</div>
          <h1 className="adminTitle">All registered teams</h1>
        </div>
        <div className="adminCount" aria-live="polite">
          <strong>{data.total}</strong> total
          {activeFilters.length > 0 && <> · filtered</>}
        </div>
      </header>

      <AdminFilterBar seasons={seasonOptions} />

      {activeFilters.length > 0 && (
        <div className="activeFilters" aria-label="Active filters">
          {activeFilters.map((f) => (
            <Link key={f.key} href={f.clearTo} className="activeFilterPill">
              <span>{f.label}</span>
              <span aria-hidden="true">×</span>
            </Link>
          ))}
        </div>
      )}

      {data.items.length === 0 ? (
        <div className="emptyState">
          <h2>No teams match this filter.</h2>
          <p>Try clearing the search or picking a different sport / season.</p>
        </div>
      ) : (
        <div className="tableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Sport</th>
                <th>Team</th>
                <th>Season</th>
                <th>Apartment</th>
                <th>Captain</th>
                <th>Mobile</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td data-label="Sport" className="cellSport">
                    <span className={`sportTag ${t.sport.toLowerCase()}`}>{t.sport}</span>
                  </td>
                  <td data-label="Team" className="cellTeam">{t.name}</td>
                  <td data-label="Season" className="cellMono">
                    {t.seasonName ?? <span style={{ color: "var(--color-text-subtle)" }}>—</span>}
                  </td>
                  <td data-label="Apartment" className="cellMuted">
                    <div>{t.apartmentName}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>{t.apartmentAddress}</div>
                  </td>
                  <td data-label="Captain" className="cellMuted">{t.captainName}</td>
                  <td data-label="Mobile" className="cellMono">{t.captainMobile}</td>
                  <td data-label="Registered" className="cellMono">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className="pagination" aria-label="Pagination">
        <span>Page {data.page} of {totalPages}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={`/teams/admin?${pageHref(qs, page - 1)}`}
            aria-disabled={page <= 1}
          >
            ← Prev
          </Link>
          <Link
            href={`/teams/admin?${pageHref(qs, page + 1)}`}
            aria-disabled={page >= totalPages}
          >
            Next →
          </Link>
        </div>
      </nav>
    </div>
  );
}

function normSport(s: string | undefined): "Cricket" | "Badminton" | "Volleyball" | "" {
  if (s === "Cricket" || s === "Badminton" || s === "Volleyball") return s;
  if (s === "cricket")    return "Cricket";
  if (s === "badminton")  return "Badminton";
  if (s === "volleyball") return "Volleyball";
  return "";
}
function clampPage(p: string | undefined) {
  const n = Number(p);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
function pageHref(qs: URLSearchParams, p: number) {
  const next = new URLSearchParams(qs);
  next.set("page", String(Math.max(1, p)));
  return next.toString();
}
function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
