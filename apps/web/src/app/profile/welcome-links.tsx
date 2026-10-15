"use client";
import { useState, useTransition } from "react";
import type { PendingLink } from "@/lib/captain";
import { acknowledgeLinkAction, leaveTeamAction } from "./actions";

export function WelcomeLinks({ initial }: { initial: PendingLink[] }) {
  const [links, setLinks] = useState<PendingLink[]>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (links.length === 0) return null;

  function keep(id: string) {
    start(async () => {
      setError(null);
      const res = await acknowledgeLinkAction(id);
      if (res.ok) {
        setLinks((l) => l.filter((x) => x.membershipId !== id));
      } else {
        setError(res.message ?? "Could not update. Try again.");
      }
    });
  }

  function leave(id: string) {
    start(async () => {
      setError(null);
      const res = await leaveTeamAction(id);
      if (res.ok) {
        setLinks((l) => l.filter((x) => x.membershipId !== id));
      } else {
        setError(res.message ?? "Could not update. Try again.");
      }
    });
  }

  function keepAll() {
    start(async () => {
      setError(null);
      const results = await Promise.allSettled(
        links.map((l) => acknowledgeLinkAction(l.membershipId)),
      );
      const failedIds = new Set<string>();
      results.forEach((result, i) => {
        const id = links[i].membershipId;
        if (result.status === "rejected" || !result.value.ok) {
          failedIds.add(id);
        }
      });
      setLinks((l) => l.filter((x) => failedIds.has(x.membershipId)));
      if (failedIds.size > 0) {
        setError("Some updates failed. The affected rows are still shown — please try again.");
      }
    });
  }

  return (
    <section className="welcomeCard" aria-busy={pending} aria-live="polite">
      <h2 className="welcomeTitle">
        You&apos;ve been added to {links.length} team{links.length > 1 ? "s" : ""}
      </h2>
      {error && (
        <p className="welcomeError" role="alert">
          {error}
        </p>
      )}
      <ul className="welcomeList">
        {links.map((l) => (
          <li key={l.membershipId} className="welcomeRow">
            <span className={`sportTag ${l.sport.toLowerCase()}`}>{l.sport}</span>
            <span className="welcomeTeam">
              {l.teamName} · {l.apartmentName}
              {l.seasonName ? ` · ${l.seasonName}` : ""}
            </span>
            <span className="welcomeActions">
              <button
                type="button"
                className="captainPrimaryBtn"
                disabled={pending}
                onClick={() => keep(l.membershipId)}
              >
                Keep
              </button>
              <button
                type="button"
                className="addCancelBtn"
                disabled={pending}
                onClick={() => leave(l.membershipId)}
              >
                Leave
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="welcomeKeepAll"
        disabled={pending}
        onClick={keepAll}
      >
        Keep all
      </button>
    </section>
  );
}
