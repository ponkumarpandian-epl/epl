import "server-only";
import { redirect } from "next/navigation";
import { api } from "./api";

export interface MeDto {
  id:          string;
  email:       string | null;
  phoneNumber: string | null;
  fullName:    string;
  avatarUrl:   string | null;
  roles:       string[];
}

export async function getCurrentUser(): Promise<MeDto | null> {
  const res = await api.get<MeDto>("/api/auth/me");
  return res.ok ? res.data : null;
}

export async function requireAuth(redirectTo = "/login"): Promise<MeDto> {
  const me = await getCurrentUser();
  if (!me) redirect(`${redirectTo}?next=${encodeURIComponent("/")}`);
  return me!;
}

export async function requireRole(role: "Admin" | "Player" | "Umpire"): Promise<MeDto> {
  const me = await requireAuth();
  if (!me.roles.includes(role)) redirect("/");
  return me;
}
