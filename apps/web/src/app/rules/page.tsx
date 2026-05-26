import type { Metadata } from "next";
import Link from "next/link";
import "@/components/forms/forms.css";

export const metadata: Metadata = { title: "Rules & Regulations" };

export default function RulesPage() {
  return (
    <div className="formShell">
      <section className="formPanel formPanelWide" style={{ textAlign: "center", gap: 16 }}>
        <div className="formEyebrow">Rules &amp; Regulations</div>
        <h1 className="formTitle">Coming soon</h1>
        <p className="formLead">
          The complete tournament rulebook — match formats, eligibility, conduct, scoring, and dispute
          resolution — will be published here before the season starts.
        </p>
        <p className="formLead" style={{ marginTop: 4 }}>
          In the meantime, sport coordinators on the home page can answer specific questions.
        </p>
        <div className="formActions" style={{ alignItems: "center" }}>
          <Link href="/" className="btn btnGhost" style={{ textDecoration: "none" }}>← Back to home</Link>
        </div>
      </section>
    </div>
  );
}
