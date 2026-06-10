"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import "./primary-nav.css";

interface Item { href: string; label: string; admin?: boolean }

const PUBLIC: Item[] = [
  { href: "/",        label: "Home" },
  { href: "/#sports", label: "Sports" },
  { href: "/teams",   label: "Teams" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/rules",   label: "Rules" },
  { href: "/contact", label: "Contact" },
];

const ADMIN: Item[] = [
  { href: "/admin/seasons", label: "Seasons",            admin: true },
  { href: "/teams/admin",   label: "Team Registrations", admin: true },
];

export function PrimaryNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return path === "/";
    if (href.startsWith("/#")) return false;
    return path?.startsWith(href);
  };

  function renderLink(item: Item, opts: { mobile?: boolean } = {}) {
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`primaryNavLink ${item.admin ? "is-admin" : ""} ${isActive(item.href) ? "is-active" : ""}`}
        onClick={() => opts.mobile && setOpen(false)}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <>
      {/* ── Desktop nav ─────────────────────────────────────────── */}
      <nav className="primaryNav primaryNavDesktop" aria-label="Primary">
        {PUBLIC.map((i) => renderLink(i))}
        {isAdmin && (
          <>
            <span className="primaryNavDivider" aria-hidden="true" />
            {ADMIN.map((i) => renderLink(i))}
          </>
        )}
      </nav>

      {/* ── Mobile hamburger ───────────────────────────────────── */}
      <button
        type="button"
        className="primaryNavToggle"
        aria-expanded={open}
        aria-label="Open navigation menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span /><span /><span />
      </button>

      {/* ── Mobile drawer ──────────────────────────────────────── */}
      <div
        className={`primaryNavDrawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <nav className="primaryNavDrawerInner" aria-label="Primary (mobile)">
          <span className="primaryNavDrawerEyebrow">Menu</span>
          {PUBLIC.map((i) => renderLink(i, { mobile: true }))}
          {isAdmin && (
            <>
              <span className="primaryNavDrawerEyebrow">Admin</span>
              {ADMIN.map((i) => renderLink(i, { mobile: true }))}
            </>
          )}
        </nav>
      </div>
    </>
  );
}
