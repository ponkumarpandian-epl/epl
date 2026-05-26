import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import "@/components/forms/forms.css";

export const metadata: Metadata = { title: "Sign in" };

interface SearchParams { next?: string }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const me   = await getCurrentUser();
  const sp   = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  if (me) redirect(next ?? "/");

  return (
    <div className="formShell">
      <section className="formPanel">
        <header>
          <div className="formEyebrow">Welcome back</div>
          <h1 className="formTitle">Sign in to EPL</h1>
          <p className="formLead">Use the email or mobile you registered with.</p>
        </header>

        <LoginForm next={next} />

        <p className="formFooter">
          New here? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}
