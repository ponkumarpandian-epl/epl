import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  FORMAT_LABEL,
  getTournamentBySlug,
  type CategoryFormat,
} from "@/lib/tournaments";
import { getCurrentUser } from "@/lib/auth";
import { RegisterEntryForm } from "./register-form";
import "../../tournaments.css";
import "./register.css";

interface PageProps {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}

export const metadata: Metadata = {
  title: "Register · Tournament",
};

export default async function TournamentRegisterPage({ params, searchParams }: PageProps) {
  const { slug }     = await params;
  const { category } = await searchParams;

  const t = await getTournamentBySlug(slug);
  if (!t) notFound();

  // The query param is the source of truth for which category we're registering to.
  // If it's missing, send the user back to the detail page and let them pick.
  if (!category) redirect(`/tournaments/${slug}`);

  const cat = t.categories.find((c) => c.format === category);
  if (!cat) redirect(`/tournaments/${slug}`);

  // Read identity from /api/auth/me — server-side, server-only. If null the form falls back
  // to the anonymous flow with Name + Mobile inputs.
  const me = await getCurrentUser();

  const closed =
    !t.registrationOpen ||
    !cat.registrationOpen ||
    cat.totalEntries >= cat.maxEntries ||
    (t.registrationDeadline && new Date(t.registrationDeadline) < new Date());

  return (
    <div className="tournDetailShell">
      <Link href={`/tournaments/${slug}?category=${category}`} className="tournDetailBack">
        ← Back to {t.name}
      </Link>

      <header className="tournDetailHeader">
        <div className="tournDetailEyebrow">
          {t.gameName.toUpperCase()} · {FORMAT_LABEL[cat.format as CategoryFormat]}
        </div>
        <h1 className="tournDetailTitle">Register for {t.name}</h1>
        <div className="tournDetailMeta">
          <span>📋 <b>{FORMAT_LABEL[cat.format as CategoryFormat]}</b></span>
          <span>👥 <b>{cat.totalEntries} / {cat.maxEntries}</b> spots filled</span>
          <span>💸 <b>{(cat.entryFeeRupees > 0 ? cat.entryFeeRupees : t.entryFeeRupees) === 0
              ? "Free entry"
              : "₹" + (cat.entryFeeRupees > 0 ? cat.entryFeeRupees : t.entryFeeRupees).toLocaleString("en-IN")}</b></span>
        </div>
      </header>

      {closed ? (
        <section className="tournEmpty" role="status" style={{ marginTop: 0 }}>
          <h2 className="tournEmptyTitle">Registration is closed</h2>
          <p className="tournEmptyLead">
            This category isn&apos;t accepting entries right now. Head back to the tournament page to see
            other formats, or reach out to the organisers on WhatsApp.
          </p>
        </section>
      ) : (
        <RegisterEntryForm
          slug={slug}
          categoryId={cat.id}
          format={cat.format as CategoryFormat}
          whatsAppGroupUrl={t.whatsAppGroupUrl}
          me={me ? { fullName: me.fullName, phoneNumber: me.phoneNumber } : null}
        />
      )}
    </div>
  );
}
