"use server";
import { redirect } from "next/navigation";
import { loginSchema, isEmail, isIndianMobile } from "@/lib/schemas";
import { api } from "@/lib/api";

export interface LoginState {
  values?:      { identifier?: string };
  fieldErrors?: Record<string, string>;
  topError?:    string;
}

export async function loginAction(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const raw = {
    identifier: String(formData.get("identifier") ?? ""),
    password:   String(formData.get("password")   ?? ""),
  };
  const next = String(formData.get("next") ?? "/");

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors, values: { identifier: raw.identifier } };
  }

  // MapIdentityApi accepts { email, password } or { username, password }.
  // Email-only users have UserName = Email; mobile users have UserName = "+91…".
  // useCookies=true issues the cookie instead of returning a bearer token JSON.
  const body = isEmail(parsed.data.identifier)
    ? { email:    parsed.data.identifier.toLowerCase(), password: parsed.data.password }
    : isIndianMobile(parsed.data.identifier)
    ? { email:    "+91" + parsed.data.identifier,       password: parsed.data.password }
    : { email:    parsed.data.identifier,               password: parsed.data.password };

  const res = await api.post("/identity/login?useCookies=true", body);
  if (!res.ok) {
    const isAuthFailure = res.status === 401 || res.status === 400;
    return {
      topError: isAuthFailure
        ? "Email/mobile and password do not match. Try again."
        : (res.message ?? "Sign-in failed. Please try again."),
      values:   { identifier: raw.identifier },
    };
  }

  redirect(next || "/");
}
