"use client";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { PasswordField } from "@/components/forms/password-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormBanner } from "@/components/forms/form-banner";
import { registerAction, type RegisterState } from "./actions";
import "@/components/forms/forms.css";

export function RegisterForm() {
  const [state, formAction] = useActionState<RegisterState | undefined, FormData>(registerAction, undefined);

  return (
    <form action={formAction} noValidate>
      <div className="formActions" style={{ gap: 20 }}>
        {state?.topError && <FormBanner title="Couldn’t create your account">{state.topError}</FormBanner>}

        <Field
          name="fullName"
          label="Full name"
          autoComplete="name"
          required
          maxLength={120}
          defaultValue={state?.values?.fullName}
          error={state?.fieldErrors?.fullName}
        />

        <Field
          name="identifier"
          label="Email or 10-digit mobile"
          inputMode="email"
          autoComplete="username"
          required
          placeholder="you@example.com or 9876543210"
          defaultValue={state?.values?.identifier}
          error={state?.fieldErrors?.identifier}
          hint="Indian mobile only (starts with 6–9)."
        />

        <PasswordField
          name="password"
          label="Password"
          required
          autoComplete="new-password"
          placeholder="Min 8 chars · 1 uppercase · 1 digit"
          error={state?.fieldErrors?.password}
        />

        <SubmitButton pendingLabel="Creating account…">Create account →</SubmitButton>
      </div>
    </form>
  );
}
