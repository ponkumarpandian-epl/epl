"use client";
import { useEffect, useState, useTransition } from "react";
import type { TeamRoster, TeamMember, UserSearchResult } from "@/lib/captain";
import { addMemberAction, removeMemberAction, searchUsersAction, transferCaptaincyAction } from "../../actions";

interface Props {
  teamId:        string;
  initialRoster: TeamRoster;
}

export function RosterManager({ teamId, initialRoster }: Props) {
  const [members, setMembers]   = useState<TeamMember[]>(sortMembers(initialRoster.members));
  const [captainId, setCaptain] = useState<string | null>(initialRoster.captainUserId);
  const [error, setError]       = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const max  = initialRoster.maxRosterSize;
  const full = members.length >= max;

  function removeMember(m: TeamMember) {
    if (m.isCaptain) { setError("Transfer captaincy before removing the captain."); return; }
    setError(null);
    const prev = members;
    setMembers((list) => list.filter((x) => x.id !== m.id));   // optimistic
    startTransition(async () => {
      const res = await removeMemberAction(teamId, m.id);
      if (!res.ok) { setMembers(prev); setError(res.message ?? "Could not remove player."); }
    });
  }

  function addMember(u: UserSearchResult, shirt: string | null, position: string | null, done: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await addMemberAction(teamId, u.id, shirt, position);
      if (!res.ok) { setError(res.message ?? "Could not add player."); return; }
      if (res.data) setMembers((list) => sortMembers([...list, res.data!]));
      done();
    });
  }

  function transfer(newCaptainUserId: string) {
    setError(null);
    const prevCaptain = captainId;
    const prevMembers = members;
    setCaptain(newCaptainUserId);
    setMembers((list) => sortMembers(list.map((m) => ({ ...m, isCaptain: m.userId === newCaptainUserId }))));
    setTransferOpen(false);
    startTransition(async () => {
      const res = await transferCaptaincyAction(teamId, newCaptainUserId);
      if (!res.ok) { setCaptain(prevCaptain); setMembers(prevMembers); setError(res.message ?? "Could not transfer captaincy."); }
    });
  }

  return (
    <div className="rosterWrap" aria-busy={pending}>
      <section className="rosterPanel">
        <div className="rosterPanelHead">
          <h2 className="rosterPanelTitle">Roster</h2>
          <div className="rosterCount">
            <strong>{members.length}</strong> / {max} players
            {members.length > 1 && (
              <button
                type="button"
                className="transferBtn"
                onClick={() => setTransferOpen(true)}
                disabled={pending}
              >
                Transfer captaincy
              </button>
            )}
          </div>
        </div>

        {error && <p className="rosterError" role="alert">{error}</p>}

        {members.length === 0 ? (
          <div className="rosterEmptyRow">No players yet — add your first one below.</div>
        ) : (
          <table className="rosterTable">
            <thead>
              <tr>
                <th>Player</th>
                <th>Mobile</th>
                <th>Shirt</th>
                <th>Position</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className={m.isCaptain ? "is-captain" : undefined}>
                  <td data-label="Player" className="rosterPlayer">
                    <span className="rosterAvatar" aria-hidden="true">
                      {m.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={m.avatarUrl} alt="" /> : initials(m.fullName)}
                    </span>
                    <span className="rosterName">
                      {m.fullName}
                      {m.isCaptain && <span className="captainBadge" title="Captain">C</span>}
                    </span>
                  </td>
                  <td data-label="Mobile" className="rosterMono">{m.phoneMasked}</td>
                  <td data-label="Shirt">{m.shirtNumber ?? "—"}</td>
                  <td data-label="Position">{m.position ?? "—"}</td>
                  <td className="rosterRowActions">
                    {!m.isCaptain && (
                      <button
                        type="button"
                        className="rosterRemoveBtn"
                        onClick={() => removeMember(m)}
                        disabled={pending}
                        aria-label={`Remove ${m.fullName}`}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AddPlayer
        teamId={teamId}
        disabled={full}
        existingUserIds={members.map((m) => m.userId)}
        onAdd={addMember}
        pending={pending}
      />

      {transferOpen && (
        <TransferModal
          candidates={members.filter((m) => m.userId !== captainId)}
          onPick={transfer}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </div>
  );
}

// ── Add-player search + form ──────────────────────────────────────────────
function AddPlayer({
  teamId, disabled, existingUserIds, onAdd, pending,
}: {
  teamId:          string;
  disabled:        boolean;
  existingUserIds: string[];
  onAdd:           (u: UserSearchResult, shirt: string | null, position: string | null, done: () => void) => void;
  pending:         boolean;
}) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked]   = useState<UserSearchResult | null>(null);
  const [shirt, setShirt]     = useState("");
  const [position, setPosition] = useState("");

  // Debounced search. All state writes happen inside the (async) timer callback,
  // never synchronously in the effect body. teamId is in scope for clarity.
  useEffect(() => {
    if (picked) return;
    const term = query.trim();
    const handle = setTimeout(() => {
      if (term.length < 2) { setResults([]); setSearching(false); return; }
      setSearching(true);
      searchUsersAction(term).then((res) => {
        setResults(res.ok && res.data ? res.data.filter((u) => !existingUserIds.includes(u.id)) : []);
        setSearching(false);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query, picked, existingUserIds]);

  function reset() {
    setPicked(null); setQuery(""); setResults([]); setShirt(""); setPosition("");
  }

  if (disabled) {
    return (
      <section className="addPanel">
        <h2 className="rosterPanelTitle">Add a player</h2>
        <div className="rosterEmptyRow">Roster is full. Remove a player to add another.</div>
      </section>
    );
  }

  return (
    <section className="addPanel" data-team={teamId}>
      <h2 className="rosterPanelTitle">Add a player</h2>

      {!picked ? (
        <>
          <input
            type="search"
            className="addSearchInput"
            placeholder="Search players by name, mobile or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search players to add"
          />
          {query.trim().length >= 2 && (
            <ul className="addResults" aria-live="polite">
              {searching && <li className="addResultHint">Searching…</li>}
              {!searching && results.length === 0 && (
                <li className="addResultHint">
                  No players found. They must register first — share <code>/auth/register</code> with them.
                </li>
              )}
              {results.map((u) => (
                <li key={u.id}>
                  <button type="button" className="addResultBtn" onClick={() => setPicked(u)}>
                    <span className="rosterAvatar" aria-hidden="true">
                      {u.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={u.avatarUrl} alt="" /> : initials(u.fullName)}
                    </span>
                    <span className="addResultName">{u.fullName}</span>
                    <span className="rosterMono">{u.phoneMasked}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="addForm">
          <div className="addFormPicked">
            <span className="rosterAvatar" aria-hidden="true">
              {picked.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={picked.avatarUrl} alt="" /> : initials(picked.fullName)}
            </span>
            <strong>{picked.fullName}</strong>
            <span className="rosterMono">{picked.phoneMasked}</span>
          </div>
          <div className="addFormFields">
            <input
              className="addFieldInput" placeholder="Shirt # (optional)" maxLength={10}
              value={shirt} onChange={(e) => setShirt(e.target.value)} aria-label="Shirt number"
            />
            <input
              className="addFieldInput" placeholder="Position (optional)" maxLength={60}
              value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Position"
            />
          </div>
          <div className="addFormButtons">
            <button
              type="button" className="captainPrimaryBtn" disabled={pending}
              onClick={() => onAdd(picked, shirt.trim() || null, position.trim() || null, reset)}
            >
              Add to roster
            </button>
            <button type="button" className="addCancelBtn" onClick={reset} disabled={pending}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Transfer-captaincy modal ───────────────────────────────────────────────
function TransferModal({
  candidates, onPick, onClose,
}: {
  candidates: TeamMember[];
  onPick:     (userId: string) => void;
  onClose:    () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Transfer captaincy" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <h2 className="modalTitle">Transfer captaincy</h2>
        <p className="modalLead">Pick a player to become the new captain. You&apos;ll stay on the roster.</p>
        {candidates.length === 0 ? (
          <p className="rosterEmptyRow">Add another player first — you can&apos;t transfer to yourself.</p>
        ) : (
          <ul className="modalList">
            {candidates.map((m) => (
              <li key={m.id}>
                <button type="button" className="addResultBtn" onClick={() => onPick(m.userId)}>
                  <span className="rosterAvatar" aria-hidden="true">
                    {m.avatarUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.avatarUrl} alt="" /> : initials(m.fullName)}
                  </span>
                  <span className="addResultName">{m.fullName}</span>
                  <span className="rosterMono">{m.phoneMasked}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="addCancelBtn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function sortMembers(list: TeamMember[]): TeamMember[] {
  return [...list].sort((a, b) =>
    (a.isCaptain === b.isCaptain) ? a.fullName.localeCompare(b.fullName) : a.isCaptain ? -1 : 1);
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
