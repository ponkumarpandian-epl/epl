import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FORMAT_LABEL,
  getTournamentById,
} from "@/lib/tournaments";
import { TournamentControlPanel } from "./control-panel";
import { AddCategoryForm } from "./add-category-form";
import { EntriesSection } from "./entries-section";
import { BracketSection } from "./bracket-section";
import { deleteCategoryAction } from "./actions";
import "../../admin.css";
import "../admin-tournaments.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const t = await getTournamentById(id);
  return { title: t ? `${t.name} · Admin` : "Tournament · Admin" };
}

function fmtDateRange(startIso?: string, endIso?: string): string {
  if (!startIso) return "Dates to be announced";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)}` : fmt(startIso);
}

export default async function AdminTournamentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTournamentById(id);
  if (!t) notFound();

  return (
    <>
      <section className="adminHero">
        <div className="adminHeroInner">
          <div className="adminHeroTitleBlock">
            <span className="adminHeroEyebrow">
              {t.gameName.toUpperCase()} · <Link href="/admin/tournaments" style={{ color: "inherit" }}>← All tournaments</Link>
            </span>
            <h1 className="adminHeroTitle">{t.name}</h1>
            <p className="adminHeroLead">
              <span>{fmtDateRange(t.startsOn, t.endsOn)}</span>
              {t.venue && <> · <span>{t.venue}</span></>}
              {" · "}
              <span style={{ color: "var(--gold-bright)" }}>/{t.slug}</span>
            </p>
          </div>
          <div className="adminHeroActions">
            <Link href={`/tournaments/${t.slug}`} className="adminBtn adminBtnGhost" target="_blank" rel="noopener noreferrer">
              View public page →
            </Link>
          </div>
        </div>
      </section>

      <TournamentControlPanel tournament={t} />

      <section className="adminTournFormCard" style={{ marginTop: 24, maxWidth: 900 }}>
        <h2>Categories</h2>
        <p className="help">Add or remove categories — each has its own entry list and (later) its own draw.</p>

        {t.categories.length === 0 ? (
          <div style={{ padding: "16px 0", color: "var(--bone-fade)", fontSize: 13 }}>
            No categories yet. Add at least one below.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "8px 0 16px" }}>
            <thead>
              <tr style={{ textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", color: "var(--bone-fade)", textTransform: "uppercase" }}>
                <th style={{ padding: "8px 4px" }}>Format</th>
                <th style={{ padding: "8px 4px" }}>Name</th>
                <th style={{ padding: "8px 4px" }}>Min / Max</th>
                <th style={{ padding: "8px 4px" }}>Fee</th>
                <th style={{ padding: "8px 4px" }}>Open</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {t.categories.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 4px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan-bright)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {FORMAT_LABEL[c.format]}
                  </td>
                  <td style={{ padding: "10px 4px", color: "var(--bone)", fontSize: 14 }}>{c.name}</td>
                  <td style={{ padding: "10px 4px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--bone-dim)" }}>
                    {c.minEntries} / {c.maxEntries}
                  </td>
                  <td style={{ padding: "10px 4px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gold-bright)" }}>
                    {c.entryFeeRupees === 0 ? "free" : `₹${c.entryFeeRupees.toLocaleString("en-IN")}`}
                  </td>
                  <td style={{ padding: "10px 4px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    <span style={{ color: c.registrationOpen ? "#4ee586" : "var(--bone-fade)" }}>
                      {c.registrationOpen ? "open" : "closed"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 4px", textAlign: "right" }}>
                    <form action={deleteCategoryAction}>
                      <input type="hidden" name="tournamentId" value={t.id} />
                      <input type="hidden" name="categoryId"   value={c.id} />
                      <button className="catRemoveBtn" type="submit" aria-label={`Remove ${FORMAT_LABEL[c.format]}`} style={{ width: 28, height: 28 }}>×</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <AddCategoryForm tournamentId={t.id} usedFormats={t.categories.map((c) => c.format)} />
      </section>

      {t.categories.map((c) => (
        <EntriesSection key={c.id} tournamentId={t.id} category={c} />
      ))}

      {t.categories.map((c) => (
        <BracketSection key={`bracket-${c.id}`} tournamentId={t.id} category={c} />
      ))}
    </>
  );
}
