"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./admin.css";

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function TeamsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

const ITEMS = [
  { href: "/admin/seasons", label: "Seasons",            icon: <CalendarIcon /> },
  { href: "/teams/admin",   label: "Team Registrations", icon: <TeamsIcon /> },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="adminSidebar">
      <div className="adminSidebarTitle">Admin Console</div>
      <nav className="adminNav" aria-label="Admin navigation">
        {ITEMS.map((item) => {
          const active = path?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`adminNavLink ${active ? "is-active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
