"use client";
import { useState, useTransition } from "react";
import { ALL_ROLES, type AppRole } from "@/lib/roles";
import { grantRoleAction, revokeRoleAction } from "../actions";

export function RoleToggles({
  userId, initialRoles, isSelf,
}: {
  userId:       string;
  initialRoles: string[];
  isSelf:       boolean;
}) {
  const [roles, setRoles] = useState<Set<string>>(new Set(initialRoles));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(role: AppRole) {
    const has = roles.has(role);

    // Player-off is guarded by a confirm; it's the signup default.
    if (has && role === "Player" && !confirm("Remove the Player role? This is unusual.")) return;
    // You can't strip your own Admin role (server enforces too).
    if (has && role === "Admin" && isSelf) {
      setError("You can't remove your own Admin role.");
      return;
    }

    setError(null);
    const prev = new Set(roles);
    const next = new Set(roles);
    if (has) next.delete(role); else next.add(role);
    setRoles(next);   // optimistic

    startTransition(async () => {
      const res = has ? await revokeRoleAction(userId, role) : await grantRoleAction(userId, role);
      if (!res.ok) { setRoles(prev); setError(res.message ?? "Could not update role."); }
    });
  }

  return (
    <div aria-busy={pending}>
      <div className="roleToggleRow">
        {ALL_ROLES.map((role) => {
          const on = roles.has(role);
          const lockSelfAdmin = role === "Admin" && isSelf && on;
          return (
            <button
              key={role}
              type="button"
              className={`roleToggle ${on ? "is-on" : ""} role-${role.toLowerCase()}`}
              aria-pressed={on}
              disabled={pending || lockSelfAdmin}
              title={lockSelfAdmin ? "You can't remove your own Admin role" : undefined}
              onClick={() => toggle(role)}
            >
              <span className="roleToggleDot" aria-hidden="true" />
              {role}
            </button>
          );
        })}
      </div>
      {error && <p className="userRoleError" role="alert">{error}</p>}
    </div>
  );
}
