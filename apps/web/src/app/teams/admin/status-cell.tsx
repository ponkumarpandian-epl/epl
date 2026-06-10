"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { setTeamStatusAction, type TeamStatus } from "./actions";

interface Props {
  teamId:           string;
  teamLabel:        string;             // for aria-label
  initialStatus:    TeamStatus;
  initialComment:   string | null;
}

const STATUS_OPTIONS: TeamStatus[] = ["Active", "Withdrawn", "Waitlist"];

/**
 * Inline editor for a team's lifecycle status + free-text comment.
 *
 * Shape: status pill (clickable) + comment shown next to it. Clicking opens
 * a small inline editor with a <select> for status + <textarea> for the note.
 * Submit persists via the server action; admin list revalidates so any
 * counts / public listing reflect the change next render.
 *
 * Simpler than PaymentCell (no portal menu) because there's only one
 * interaction shape here — pick status, type optional note, save.
 */
export function StatusCell({ teamId, teamLabel, initialStatus, initialComment }: Props) {
  const [status,  setStatus]  = useState<TeamStatus>(initialStatus);
  const [comment, setComment] = useState<string | null>(initialComment);
  const [editing, setEditing] = useState(false);
  const [draftStatus,  setDraftStatus]  = useState<TeamStatus>(initialStatus);
  const [draftComment, setDraftComment] = useState<string>(initialComment ?? "");
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Click outside / Escape cancels editing. Inline the state resets rather
  // than calling cancel() so the effect's dep list stays clean — calling a
  // component-scope function would otherwise need useCallback to satisfy
  // react-hooks/exhaustive-deps.
  useEffect(() => {
    if (!editing) return;
    function close() { setEditing(false); setError(null); }
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown",   onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown",   onKey);
    };
  }, [editing]);

  function start() {
    setDraftStatus(status);
    setDraftComment(comment ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    const nextComment = draftComment.trim();
    const prevStatus  = status;
    const prevComment = comment;
    // Optimistic — revert on server failure.
    setStatus(draftStatus);
    setComment(nextComment === "" ? null : nextComment);
    setEditing(false);

    startTransition(async () => {
      const res = await setTeamStatusAction(teamId, draftStatus, nextComment === "" ? null : nextComment);
      if (!res.ok) {
        setStatus(prevStatus);
        setComment(prevComment);
        setError(res.message ?? "Could not save.");
      }
    });
  }

  if (editing) {
    return (
      <div ref={wrapRef} className="statusEditWrap" aria-live="polite">
        <select
          value={draftStatus}
          onChange={(e) => setDraftStatus(e.target.value as TeamStatus)}
          aria-label={`Status for ${teamLabel}`}
          className="statusSelect"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea
          value={draftComment}
          onChange={(e) => setDraftComment(e.target.value)}
          placeholder="Reason / note (optional)"
          rows={2}
          maxLength={500}
          aria-label={`Status comment for ${teamLabel}`}
          className="statusComment"
        />
        <div className="statusEditButtons">
          <button type="button" onClick={save} className="statusSaveBtn">Save</button>
          <button type="button" onClick={cancel} className="statusCancelBtn">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="statusCellView">
      <button
        type="button"
        onClick={start}
        className={`statusPill status-${status.toLowerCase()}`}
        aria-label={`Change status for ${teamLabel}; current ${status}`}
        disabled={pending}
      >
        {status}
        {pending && <span aria-hidden="true"> …</span>}
      </button>
      {comment && <span className="statusComment-view" title={comment}>{comment}</span>}
      {error && <span className="statusError" role="alert">{error}</span>}
    </div>
  );
}
