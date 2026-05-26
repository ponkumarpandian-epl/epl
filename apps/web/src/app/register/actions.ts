"use server";
import { redirect } from "next/navigation";
import { signupSchema, isEmail } from "@/lib/schemas";
import { api } from "@/lib/api";

export interface RegisterState {
  values?:      { identifier?: string; fullName?: string };
  fieldErrors?: Record<string, string>;
  topError?:    string;
}

export async function registerAction(_prev: RegisterState | undefined, formData: FormData): Promise<RegisterState> {
  const raw = {
    identifier: String(formData.get("identifier") ?? ""),
    password:   String(formData.get("password")   ?? ""),
    fullName:   String(formData.get("fullName")   ?? ""),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return {
      fieldErrors,
      values: { identifier: raw.identifier, fullName: raw.fullName },
    };
  }

  const res = await api.post<{ id: string; roles: string[] }>("/api/auth/register", parsed.data);
  if (!res.ok) {
    // Identity's "DuplicateUserName" surfaces as a field-style error → repaint identifier.
    const isDup = res.code?.toLowerCase().includes("duplicate");
    return {
      fieldErrors: isDup ? { identifier: isEmail(raw.identifier)
        ? "An account already exists for this email."
        : "An account already exists for this mobile number." } : undefined,
      topError: isDup ? undefined : res.message,
      values:   { identifier: raw.identifier, fullName: raw.fullName },
    };
  }

  redirect("/");
}
