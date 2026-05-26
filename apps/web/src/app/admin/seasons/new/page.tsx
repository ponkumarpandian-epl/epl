import type { Metadata } from "next";
import Link from "next/link";
import { NewSeasonForm } from "./new-season-form";
import "../../admin.css";
import "./new-season.css";

export const metadata: Metadata = { title: "New Season" };

export default function NewSeasonPage() {
  return (
    <>
      <section className="adminHero">
        <div className="adminHeroInner">
          <div className="adminHeroTitleBlock">
            <span className="adminHeroEyebrow">Admin · Create</span>
            <h1 className="adminHeroTitle">New Tournament Season</h1>
            <p className="adminHeroLead">
              Spin up a new season. Add games on the next screen once you save — fees, venue,
              coordinators, and WhatsApp group link can be set per sport.
            </p>
          </div>
          <div className="adminHeroActions">
            <Link href="/admin/seasons" className="adminBtn adminBtnGhost">← Back to seasons</Link>
          </div>
        </div>
      </section>

      <NewSeasonForm />
    </>
  );
}
