import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";
import "./admin.css";

export const metadata: Metadata = {
  title:  { default: "Admin · EPL", template: "%s · Admin · EPL" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("Admin");

  return (
    <div className="adminLayout">
      <AdminSidebar />
      <section className="adminContent">{children}</section>
    </div>
  );
}
