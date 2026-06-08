"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { setTeamPaymentAction } from "./actions";

interface Props {
  teamId:           string;
  teamLabel:        string;             // "{Sport} · {Team}" — used in aria-label
  initialPaid:      boolean;
  initialPaidTo:    string | null;
}

function CheckIcon() {
  return (
    <svg className="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="5"  cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function PaymentCell({ teamId, teamLabel, initialPaid, initialPaidTo }: Props) {
  const [paid,    setPaid]    = useState(initialPaid);
  const [paidTo,  setPaidTo]  = useState(initialPaidTo);
  const [editing, setEditing] = useState(false);
  const [draftTo, setDraftTo] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef    = useRef<HTMLInputElement | null>(null);
  const menuBtnRef  = useRef<HTMLButtonElement | null>(null);
  const menuRef     = useRef<HTMLDivElement   | null>(null);
  const menuOpen    = menuPos !== null;

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  // Click-outside / scroll / resize / Escape closes the ⋯ menu.
  // (Menu is portalled to document.body via fixed positioning — it doesn't
  // track its anchor on scroll, so just close it.)
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target))   return;
      if (menuBtnRef.current?.contains(target)) return;
      setMenuPos(null);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuPos(null); }
    function onScrollOrResize() { setMenuPos(null); }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown",   onKey);
    window.addEventListener("scroll",      onScrollOrResize, true);
    window.addEventListener("resize",      onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown",   onKey);
      window.removeEventListener("scroll",      onScrollOrResize, true);
      window.removeEventListener("resize",      onScrollOrResize);
    };
  }, [menuOpen]);

  function toggleMenu() {
    if (menuOpen) { setMenuPos(null); return; }
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  function persist(nextPaid: boolean, nextPaidTo: string | null) {
    const prevPaid   = paid;
    const prevPaidTo = paidTo;
    setPaid(nextPaid);
    setPaidTo(nextPaidTo);
    setError(null);
    startTransition(async () => {
      const res = await setTeamPaymentAction(teamId, nextPaid, nextPaidTo);
      if (!res.ok) {
        setPaid(prevPaid);
        setPaidTo(prevPaidTo);
        setError(res.message ?? "Could not save.");
      }
    });
  }

  function commitEdit() {
    const value = draftTo.trim();
    setEditing(false);
    persist(true, value === "" ? null : value);
  }

  function cancelEdit() {
    setEditing(false);
    setDraftTo("");
  }

  function startEdit(prefill: string) {
    setDraftTo(prefill);
    setEditing(true);
    setMenuPos(null);
  }

  function markUnpaid() {
    setMenuPos(null);
    persist(false, null);
  }

  if (editing) {
    return (
      <div className="paymentEditWrap" aria-live="polite">
        <label htmlFor={`paidTo-${teamId}`} className="visually-hidden">Paid to (coordinator name)</label>
        <input
          ref={inputRef}
          id={`paidTo-${teamId}`}
          type="text"
          value={draftTo}
          onChange={(e) => setDraftTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
            if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
          }}
          placeholder="Paid to…"
          list="paymentPaidToSuggestions"
          maxLength={80}
          disabled={pending}
        />
        <button
          type="button"
          className="paymentCommit"
          onClick={commitEdit}
          disabled={pending}
          aria-label={`Save payment for ${teamLabel}`}
        >
          <CheckIcon />
        </button>
        <button
          type="button"
          className="paymentCancel"
          onClick={cancelEdit}
          disabled={pending}
          aria-label="Cancel"
        >×</button>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="paymentWrap">
        <span
          className="paymentPill"
          role="status"
          aria-label={`${teamLabel} paid${paidTo ? ` by ${paidTo}` : ""}`}
        >
          <CheckIcon />
          <span>Paid</span>
          {paidTo && <><span className="sep">·</span><span className="paidTo">{paidTo}</span></>}
        </span>
        <button
          ref={menuBtnRef}
          type="button"
          className="paymentMenuBtn"
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Payment options for ${teamLabel}`}
          disabled={pending}
        >
          <MoreIcon />
        </button>
        {menuOpen && typeof document !== "undefined" && createPortal(
          <div
            ref={menuRef}
            className="paymentMenu"
            role="menu"
            style={{ position: "fixed", top: menuPos!.top, right: menuPos!.right }}
          >
            <button type="button" role="menuitem" onClick={() => startEdit(paidTo ?? "")}>
              Edit paid to…
            </button>
            <button type="button" role="menuitem" onClick={markUnpaid}>
              Mark unpaid
            </button>
          </div>,
          document.body,
        )}
        {error && <span className="paymentError" role="alert">{error}</span>}
      </div>
    );
  }

  return (
    <div className="paymentWrap">
      <button
        type="button"
        className="paymentBtn"
        onClick={() => startEdit("")}
        aria-pressed={false}
        aria-label={`Mark ${teamLabel} as paid`}
        disabled={pending}
      >
        Mark paid
      </button>
      {error && <span className="paymentError" role="alert">{error}</span>}
    </div>
  );
}
