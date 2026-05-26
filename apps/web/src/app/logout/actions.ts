"use server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export async function logoutAction() {
  // MapIdentityApi /logout requires an empty JSON body.
  await api.post("/identity/logout", {});
  redirect("/");
}
