import type { Metadata } from "next";
import { sportSchema, type Sport } from "@/lib/schemas";
import { TeamRegisterForm } from "./team-register-form";
import "@/components/forms/forms.css";
import "./team-register.css";

export const metadata: Metadata = { title: "Register your team" };

// Anonymous registration — no login required.
export default async function TeamRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; seasonGameId?: string }>;
}) {
  const sp           = await searchParams;
  const parsed       = sp.sport ? sportSchema.safeParse(sp.sport) : null;
  const initialSport: Sport | undefined = parsed?.success ? parsed.data : undefined;
  const seasonGameId = (sp.seasonGameId ?? "").trim() || undefined;

  return (
    <div className="formShell">
      <section className="formPanel formPanelWide">
        <header>
          <div className="formEyebrow">Team Registration · EPL Season 2</div>
          <h1 className="formTitle">Register your apartment&apos;s team</h1>
          <p className="formLead">
            One team per sport per apartment. Captain&apos;s mobile is what we&apos;ll use for tournament updates.
          </p>
        </header>

        <TeamRegisterForm initialSport={initialSport} seasonGameId={seasonGameId} />
      </section>
    </div>
  );
}
