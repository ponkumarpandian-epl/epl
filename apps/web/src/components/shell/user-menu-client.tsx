"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/logout/actions";
import type { MeDto } from "@/lib/auth";

function initials(name?: string | null, fallback?: string | null) {
  const src = (name && name.trim()) || (fallback && fallback.trim()) || "";
  if (!src) return "U";
  const parts = src.split(/[\s@]/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b || src[0]).toUpperCase();
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="userChevron">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  if (src) {
    // Plain <img> — Next/Image doesn't add value for a 38px avatar from our own API.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="userAvatar userAvatarImg" aria-hidden="true" />;
  }
  return <span className="userAvatar" aria-hidden="true">{fallback}</span>;
}

export function UserMenuClient({ me }: { me: MeDto }) {
  const [open, setOpen] = useState(false);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isAdmin    = me.roles.includes("Admin");
  const role       = isAdmin ? "Admin" : me.roles[0] ?? "Player";
  const contact    = me.email ?? me.phoneNumber ?? "";

  // Close on outside-click + Escape
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`userMenu ${open ? "is-open" : ""}`} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="userBadgeBtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${me.fullName}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar src={me.avatarUrl} fallback={initials(me.fullName, contact)} />
        <span className="userMeta">
          <span className="userEyebrow">{role}</span>
          <span className="userName">{me.fullName}</span>
        </span>
        <ChevronIcon />
      </button>

      <div
        className="userDropdown"
        role="menu"
        aria-orientation="vertical"
        aria-hidden={!open}
      >
        <div className="userDropdownHeader">
          {me.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatarUrl} alt="" className="userAvatar userAvatarLg userAvatarImg" aria-hidden="true" />
          ) : (
            <span className="userAvatar userAvatarLg" aria-hidden="true">{initials(me.fullName, contact)}</span>
          )}
          <div className="userDropdownIdentity">
            <span className="userDropdownName">{me.fullName}</span>
            {contact && <span className="userDropdownContact">{contact}</span>}
            <span className={`userRoleTag ${isAdmin ? "is-admin" : ""}`}>{role}</span>
          </div>
        </div>

        <div className="userDropdownDivider" role="separator" />

        <Link
          href="/profile"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          className="userDropdownItem"
          onClick={() => setOpen(false)}
        >
          <ProfileIcon />
          <span>My Profile</span>
        </Link>

        {isAdmin && (
          <>
            <Link
              href="/admin/seasons"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              className="userDropdownItem"
              onClick={() => setOpen(false)}
            >
              <CalendarIcon />
              <span>Seasons</span>
            </Link>
            <Link
              href="/teams/admin"
              role="menuitem"
              tabIndex={open ? 0 : -1}
              className="userDropdownItem"
              onClick={() => setOpen(false)}
            >
              <ClipboardIcon />
              <span>Team Registrations</span>
            </Link>
          </>
        )}

        <form action={logoutAction} className="userDropdownForm">
          <button
            type="submit"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            className="userDropdownItem userDropdownItemDanger"
            aria-label="Sign out and return to home"
          >
            <SignOutIcon />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
