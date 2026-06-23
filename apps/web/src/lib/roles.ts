// Pure role constants/types — safe to import from client components.
// Kept out of admin-users.ts so the server-only api.ts chain isn't pulled
// into the client bundle (role-toggles.tsx is a "use client" component).
export const ALL_ROLES = ["Admin", "Umpire", "Player"] as const;
export type AppRole = (typeof ALL_ROLES)[number];
