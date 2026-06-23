"use client";
import { useState, useTransition } from "react";
import type { PendingLink } from "@/lib/captain";
import { acknowledgeLinkAction, leaveTeamAction } from "./actions";

export function WelcomeLinks({ initial }: { initial: PendingLink[] }) {
  const [links, setLinks] = useState<PendingLink[]>(initial);
  const [pending, start] = useTransition();

  if (links.length === 0) return null;

  function keep(id: string) {
    start(async () => {
      await acknowledgeLinkAction(id);
      setLinks((l) => l.filter((x) => x.membershipId !== id));
    });
  }

  function leave(id: string) {
    start(async () => {
      await leaveTeamAction(id);
      setLinks((l) => l.filter((x) => x.membershipId !== id));
    });
  }

  function keepAll() {
    start(async () => {
      await Promise.all(links.map((l) => acknowledgeLinkAction(l.membershipId)));
      setLinks([]);
    });
  }

  return (
    <section className="welcomeCard" aria-busy={pending} aria-live="polite">
      <h2 className="welcomeTitle">
        You&apos;ve been added to {links.length} team{links.length > 1 ? "s" : ""}
      </h2>
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
