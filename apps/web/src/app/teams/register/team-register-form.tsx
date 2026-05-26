"use client";
import { useActionState, useState } from "react";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormBanner } from "@/components/forms/form-banner";
import { MapPicker } from "@/components/forms/map-picker";
import { registerTeamAction, type TeamRegisterState } from "./actions";
import type { Sport } from "@/lib/schemas";
import "@/components/forms/forms.css";

const SPORT_LABEL: Record<Sport, string> = {
  cricket:    "Cricket",
  badminton:  "Badminton",
  volleyball: "Volleyball",
};

export function TeamRegisterForm({
  initialSport,
  seasonGameId,
}: {
  initialSport?: Sport;
  seasonGameId?: string;
}) {
  const [state, formAction] = useActionState<TeamRegisterState | undefined, FormData>(registerTeamAction, undefined);
  const [sport, setSport]   = useState<Sport>(initialSport ?? state?.values?.sport ?? "cricket");

  return (
    <form action={formAction} noValidate>
      {seasonGameId && <input type="hidden" name="seasonGameId" value={seasonGameId} />}
      <div className="formActions" style={{ gap: 20 }}>
        {state?.topError && <FormBanner title="Couldn’t register your team">{state.topError}</FormBanner>}

        <div className="field">
          <label className="fieldLabel" htmlFor="sport">Sport *</label>
          <div className="sportToggle" role="radiogroup" aria-label="Sport">
            {(["cricket", "badminton", "volleyball"] as Sport[]).map((s) => (
              <label key={s} className={`sportPillToggle sport-${s}${sport === s ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="sport"
                  value={s}
                  checked={sport === s}
                  onChange={() => setSport(s)}
                />
                <span>{SPORT_LABEL[s]}</span>
              </label>
            ))}
          </div>
          {state?.fieldErrors?.sport && <span className="fieldError">{state.fieldErrors.sport}</span>}
        </div>

        <Field
          name="apartmentName"
          label="Apartment name"
          required
          maxLength={120}
          autoComplete="off"
          placeholder="e.g. Prestige Sunrise"
          defaultValue={state?.values?.apartmentName}
          error={state?.fieldErrors?.apartmentName}
          hint={"Combining two apartments? Either pick one apartment name, or use “+” to mention both — e.g. “Prestige Sunrise + Brigade Meadows”."}
        />

        <Field
          name="teamName"
          label="Team name"
          required
          maxLength={60}
          autoComplete="off"
          defaultValue={state?.values?.teamName}
          error={state?.fieldErrors?.teamName}
        />

        <Field
          name="captainName"
          label="Captain name"
          required
          maxLength={80}
          autoComplete="name"
          defaultValue={state?.values?.captainName}
          error={state?.fieldErrors?.captainName}
        />

        <Field
          name="captainMobile"
          label="Captain mobile (10-digit)"
          required
          inputMode="tel"
          maxLength={10}
          autoComplete="tel-national"
          placeholder="9876543210"
          defaultValue={state?.values?.captainMobile}
          error={state?.fieldErrors?.captainMobile}
          hint="No +91 — just the 10 digits."
        />

        <MapPicker
          defaultValue={{
            lat:     state?.values?.apartmentLat,
            lng:     state?.values?.apartmentLng,
            address: state?.values?.apartmentAddress,
          }}
          error={state?.fieldErrors?.apartmentLat ?? state?.fieldErrors?.apartmentLng ?? state?.fieldErrors?.apartmentAddress}
        />

        <SubmitButton pendingLabel="Submitting…">Register team →</SubmitButton>
      </div>
    </form>
  );
}
