"use client";

import { useActionState } from "react";
import type { CategoryFormat } from "@/lib/tournaments-types";
import { registerEntryAction, type RegisterEntryState } from "./actions";

export interface RegisterIdentity {
  fullName:    string;
  phoneNumber: string | null;
}

interface RegisterEntryFormProps {
  slug:              string;
  categoryId:        string;
  format:            CategoryFormat;
  whatsAppGroupUrl?: string;
  /** Profile of the signed-in user. Null when the visitor is anonymous. */
  me:                RegisterIdentity | null;
}

export function RegisterEntryForm({ slug, categoryId, format, whatsAppGroupUrl, me }: RegisterEntryFormProps) {
  // Bind the slug + categoryId + format into the action so the form's <form action> only deals with FormData.
  const boundAction = registerEntryAction.bind(null, slug, categoryId, format);

  const [state, action, pending] = useActionState<RegisterEntryState | undefined, FormData>(
    boundAction,
    undefined,
  );

  const v  = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};
  const isDoubles = format !== "Singles";

  // When the user is logged in, Slot 1 is the authenticated identity. We never re-ask for
  // their name. We re-ask for mobile *only* if their profile doesn't carry one yet.
  const loggedIn   = me !== null;
  const needMobile = loggedIn && !me.phoneNumber;

  return (
    <form action={action} className="tournRegisterForm" noValidate>
      {state?.topError && (
        <div className="tournRegisterTopErr" role="alert">{state.topError}</div>
      )}

      <section className="tournRegisterCard">
        <h2>Your details</h2>
        <p className="tournRegisterHelp">
          {loggedIn
            ? "You're signed in, so the organisers already know who you are."
            : "Mobile is how the organisers will reach you on match day."}
        </p>

        {loggedIn ? (
          <div className="tournRegisterIdentity" role="group" aria-label="Registering as">
            <span className="tournRegisterIdentityLabel">Registering as</span>
            <div className="tournRegisterIdentityBody">
              <span className="tournRegisterIdentityName">{me.fullName}</span>
              {me.phoneNumber && <span className="tournRegisterIdentityPhone">{me.phoneNumber}</span>}
            </div>
            <a
              href={`/login?next=${encodeURIComponent(`/tournaments/${slug}/register?category=${format}`)}`}
              className="tournRegisterIdentitySwitch"
            >
              Not you? Switch accounts →
            </a>
          </div>
        ) : (
          <div className="tournRegisterField">
            <label htmlFor="player1Name">Your name *</label>
            <div>
              <input
                id="player1Name"
                name="player1Name"
                autoComplete="name"
                maxLength={80}
                required
                defaultValue={v.player1Name ?? ""}
              />
              {fe.player1Name && <span className="tournRegisterFieldErr">{fe.player1Name}</span>}
            </div>
          </div>
        )}

        {(!loggedIn || needMobile) && (
          <div className="tournRegisterField">
            <label htmlFor="player1Mobile">{needMobile ? "Mobile (missing from your profile) *" : "Mobile *"}</label>
            <div>
              <input
                id="player1Mobile"
                name="player1Mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="+91 9XXXX XXXXX"
                required
                defaultValue={v.player1Mobile ?? ""}
              />
              {fe.player1Mobile && <span className="tournRegisterFieldErr">{fe.player1Mobile}</span>}
            </div>
          </div>
        )}
      </section>

      {isDoubles && (
        <section className="tournRegisterCard">
          <h2>Your partner</h2>
          <p className="tournRegisterHelp">{format === "MixedDoubles" ? "Mixed doubles — one player of each gender." : "Doubles — both players from your pair sign up together."}</p>

          <div className="tournRegisterField">
            <label htmlFor="player2Name">Partner&apos;s name *</label>
            <div>
              <input
                id="player2Name"
                name="player2Name"
                maxLength={80}
                required={isDoubles}
                defaultValue={v.player2Name ?? ""}
              />
              {fe.player2Name && <span className="tournRegisterFieldErr">{fe.player2Name}</span>}
            </div>
          </div>

          <div className="tournRegisterField">
            <label htmlFor="player2Mobile">Partner&apos;s mobile *</label>
            <div>
              <input
                id="player2Mobile"
                name="player2Mobile"
                type="tel"
                inputMode="tel"
                maxLength={20}
                placeholder="+91 9XXXX XXXXX"
                required={isDoubles}
                defaultValue={v.player2Mobile ?? ""}
              />
              {fe.player2Mobile && <span className="tournRegisterFieldErr">{fe.player2Mobile}</span>}
            </div>
          </div>
        </section>
      )}

      <section className="tournRegisterCard">
        <h2>Optional</h2>
        <p className="tournRegisterHelp">Want a team name on the bracket card? Add it here.</p>

        <div className="tournRegisterField">
          <label htmlFor="teamLabel">Team label</label>
          <div>
            <input
              id="teamLabel"
              name="teamLabel"
              maxLength={80}
              placeholder="Smashers, Court Kings, …"
              defaultValue={v.teamLabel ?? ""}
            />
            {fe.teamLabel && <span className="tournRegisterFieldErr">{fe.teamLabel}</span>}
          </div>
        </div>
      </section>

      <div className="tournRegisterFoot">
        <p className="tournRegisterFootHint">
          You&apos;ll land on the tournament page with a confirmation. Entries start as <b>Pending</b> until
          an organiser confirms.
          {whatsAppGroupUrl && (
            <> Join the <a href={whatsAppGroupUrl} target="_blank" rel="noopener noreferrer">WhatsApp group</a> for live updates.</>
          )}
        </p>
        <button type="submit" disabled={pending} className="tournRegisterSubmit">
          {pending ? "Submitting…" : "Submit entry →"}
        </button>
      </div>
    </form>
  );
}
