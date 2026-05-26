"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import "./admin.css";

const SPORTS: { id: "" | "Cricket" | "Badminton" | "Volleyball"; label: string; cls: string }[] = [
  { id: "",           label: "All",        cls: "" },
  { id: "Cricket",    label: "Cricket",    cls: "sport-cricket" },
  { id: "Badminton",  label: "Badminton",  cls: "sport-badminton" },
  { id: "Volleyball", label: "Volleyball", cls: "sport-volleyball" },
];

export interface SeasonOption { id: string; label: string; isActive: boolean; }

export function AdminFilterBar({ seasons }: { seasons: SeasonOption[] }) {
  const router    = useRouter();
  const params    = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("search")   ?? "");
  const sport               = params.get("sport")             ?? "";
  const seasonId            = params.get("seasonId")          ?? "";

  function navigate(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`/teams/admin?${next}`));
  }

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate({ search: search.trim() || undefined });
  }
  function onClear() {
    setSearch("");
    startTransition(() => router.replace("/teams/admin"));
  }

  return (
    <form className="filterBar" onSubmit={onSearchSubmit} role="search">
      <input
        className="searchInput"
        type="search"
        name="q"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by team name, captain, or apartment…"
        aria-label="Search teams"
      />

      {seasons.length > 0 && (
        <label className="filterSelectWrap">
          <span className="filterSelectLabel">Season</span>
          <select
            className="filterSelect"
            value={seasonId}
            onChange={(e) => navigate({ seasonId: e.target.value || undefined })}
            disabled={pending}
            aria-label="Filter by season"
          >
            <option value="">All seasons</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}{s.isActive ? " · Active" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="filterChips" role="tablist" aria-label="Filter by sport">
        {SPORTS.map((s) => (
          <button
            key={s.id || "all"}
            type="button"
            role="tab"
            aria-selected={sport === s.id}
            className={`filterChip ${s.cls} ${sport === s.id ? "is-active" : ""}`}
            onClick={() => navigate({ sport: s.id || undefined })}
            disabled={pending}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="filterRight">
        <button type="submit"  className="filterApplyBtn"  disabled={pending}>
          {pending ? "Filtering…" : "Apply"}
        </button>
        {(search || sport || seasonId) && (
          <button type="button" onClick={onClear} className="filterClearBtn" disabled={pending}>
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
