import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { UserMenuClient } from "./user-menu-client";
import "./user-menu.css";

export async function UserMenu() {
  const me = await getCurrentUser();

  if (!me) {
    return (
      <div className="userMenu">
        <Link href="/login" className="userMenuLink">Sign in</Link>
      </div>
    );
  }

  return <UserMenuClient me={me} />;
}
