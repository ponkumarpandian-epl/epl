"use client";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { PasswordField } from "@/components/forms/password-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormBanner } from "@/components/forms/form-banner";
import { loginAction, type LoginState } from "./actions";
import "@/components/forms/forms.css";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState | undefined, FormData>(loginAction, undefined);

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <div className="formActions" style={{ gap: 20 }}>
        {state?.topError && <FormBanner title="Sign-in failed">{state.topError}</FormBanner>}

        <Field
          name="identifier"
          label="Email or mobile"
          inputMode="email"
          autoComplete="username"
          required
          placeholder="you@example.com or 9876543210"
          defaultValue={state?.values?.identifier}
          error={state?.fieldErrors?.identifier}
        />

        <PasswordField
          name="password"
          label="Password"
          required
          autoComplete="current-password"
          error={state?.fieldErrors?.password}
        />

        <SubmitButton pendingLabel="Signing in…">Sign in →</SubmitButton>
      </div>
    </form>
  );
}
