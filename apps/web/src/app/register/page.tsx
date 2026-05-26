import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";
import "@/components/forms/forms.css";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage() {
  const me = await getCurrentUser();
  if (me) redirect("/");

  return (
    <div className="formShell">
      <section className="formPanel">
        <header>
          <div className="formEyebrow">Sign up · Player</div>
          <h1 className="formTitle">Join EPL Season 2</h1>
          <p className="formLead">
            New players are automatically added to the <strong>Player</strong> role.
            You can register a team for your apartment right after.
          </p>
        </header>

        <RegisterForm />

        <p className="formFooter">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
