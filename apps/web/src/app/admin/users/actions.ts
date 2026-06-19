"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export interface ActionResult { ok: boolean; message?: string; }

export async function grantRoleAction(userId: string, role: string): Promise<ActionResult> {
  const res = await api.post(`/api/admin/users/${userId}/roles`, { role });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function revokeRoleAction(userId: string, role: string): Promise<ActionResult> {
  const res = await api.del(`/api/admin/users/${userId}/roles/${role}`);
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}
