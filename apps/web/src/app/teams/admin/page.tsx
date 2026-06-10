import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { api } from "@/lib/api";
import { listAllSeasons } from "@/lib/seasons";
import { AdminFilterBar, type SeasonOption } from "./filter-bar";
import { PaymentCell } from "./payment-cell";
import { StatusCell } from "./status-cell";
import type { TeamStatus } from "./actions";
import "./admin.css";

/** wa.me requires plain digits — strip `+` and spacing. tel: keeps the leading `+`. */
function waUrl(mobile: string)  { return `https://wa.me/${mobile.replace(/\D/g, "")}`; }
function telUrl(mobile: string) { return `tel:${mobile.replace(/\s/g, "")}`; }

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2A10 10 0 0 0 3.04 16.41L2 22l5.69-1.04A10 10 0 1 0 12 2zm5.42 14.4c-.23.64-1.36 1.22-1.87 1.27-.5.05-.97.21-3.27-.69-2.78-1.08-4.55-3.89-4.69-4.08-.13-.18-1.13-1.5-1.13-2.86 0-1.36.72-2.03.97-2.31.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.07.62.47.23.55.79 1.91.86 2.05.07.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.43.49-.14.13-.29.28-.13.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.22 2.19 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.13.45.2.52.31.07.11.07.64-.16 1.27z" />
    </svg>
  );
}

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
  paymentCompleted: boolean;
  paidTo:           string | null;
  paidAt:           string | null;
  status:           TeamStatus;
  statusComment:    string | null;
}
interface PagedResponse<T> { items: T[]; total: number; page: number; pageSize: number; }

interface SearchParams { sport?: string; search?: string; seasonId?: string; status?: string; page?: string }

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
  // Status filter — page default is "Active". The URL omits the param at
  // default so /teams/admin stays the canonical landing URL.
  // "All" is the sentinel for "no status filter".
  const status    = normStatus(sp.status);
  const page      = clampPage(sp.page);
  const pageSize  = 20;

  const qs = new URLSearchParams();
  if (sport)            qs.set("sport", sport);
  if (search)           qs.set("search", search);
  if (seasonId)         qs.set("seasonId", seasonId);
  if (status !== "All") qs.set("status", status);   // omit when "All" — API treats absent as no filter
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
  // Status chip only when off the page default. "Active" is implicit; "All"
  // and the others are explicit deviations that deserve to be visible + clearable.
  if (status !== "Active") activeFilters.push({ key: "status",  label: `Status: ${status}`,                clearTo: makeClearHref("status") });

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
                <th>Registered</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id} className={t.paymentCompleted ? "row-paid" : undefined}>
                  <td data-label="Sport" className="cellSport">
                    <span className={`sportTag ${t.sport.toLowerCase()}`}>{t.sport}</span>
                  </td>
                  <td data-label="Team" className="cellTeam">{t.name}</td>
                  <td data-label="Season" className="cellMono">
                    {t.seasonName ?? <span style={{ color: "var(--color-text-subtle)" }}>—</span>}
                  </td>
                  <td data-label="Apartment" className="cellApartment cellMuted">
                    <div>{t.apartmentName}</div>
                    <div className="cellApartmentAddress">{t.apartmentAddress}</div>
                  </td>
                  <td data-label="Captain" className="cellCaptain cellMuted">
                    <div>{t.captainName}</div>
                    <div className="cellCaptainMobile">
                      <span className="captainMobileNumber">{t.captainMobile}</span>
                      <a
                        href={telUrl(t.captainMobile)}
                        className="captainContactIcon"
                        aria-label={`Call ${t.captainName} on ${t.captainMobile}`}
                      >
                        <PhoneIcon />
                      </a>
                      <a
                        href={waUrl(t.captainMobile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="captainContactIcon is-whatsapp"
                        aria-label={`Open WhatsApp chat with ${t.captainName}`}
                      >
                        <WhatsAppIcon />
                      </a>
                    </div>
                  </td>
                  <td data-label="Registered" className="cellMono">{formatDate(t.createdAt)}</td>
                  <td data-label="Payment" className="cellPayment">
                    <PaymentCell
                      teamId={t.id}
                      teamLabel={`${t.sport} ${t.name}`}
                      initialPaid={t.paymentCompleted}
                      initialPaidTo={t.paidTo}
                    />
                  </td>
                  <td data-label="Status" className="cellStatus">
                    <StatusCell
                      teamId={t.id}
                      teamLabel={`${t.sport} ${t.name}`}
                      initialStatus={t.status}
                      initialComment={t.statusComment}
                    />
                  </td>
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
function normStatus(s: string | undefined): "Active" | "Withdrawn" | "Waitlist" | "All" {
  if (s === "Withdrawn" || s === "Waitlist" || s === "All") return s;
  // Default — covers both "missing" and any unknown string. "Active" is the
  // page-level default per the user's spec.
  return "Active";
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
