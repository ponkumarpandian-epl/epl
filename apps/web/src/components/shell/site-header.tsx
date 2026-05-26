import Image from "next/image";
import Link from "next/link";
import "../home/home.css";
import { UserMenu } from "./user-menu";
import { PrimaryNav } from "./primary-nav";
import { getCurrentSeason } from "@/lib/seasons";
import { getCurrentUser }   from "@/lib/auth";

export async function SiteHeader() {
  const [season, me] = await Promise.all([getCurrentSeason(), getCurrentUser()]);
  const isAdmin = me?.roles.includes("Admin") ?? false;

  const registrationOpen = season?.registrationOpen ?? false;
  const seasonName       = season?.name ?? "EPL";
  const statusLabel      = season
    ? (registrationOpen ? `${seasonName} · Open` : `${seasonName} · Closed`)
    : "Coming Soon";
  const statusModifier   = season
    ? (registrationOpen ? "siteStatus-open" : "siteStatus-closed")
    : "siteStatus-pending";

  return (
    <header className="siteHeader">
      <Link href="/" className="siteBrand" aria-label="EPL home">
        <Image
          src="/logo.png"
          alt=""
          width={104}
          height={104}
          className="siteLogo"
          priority
          sizes="(max-width: 760px) 38px, (max-width: 1080px) 44px, 52px"
        />
        <span className="siteBrandText">
          <span className="siteBrandEyebrow">Electronic-City</span>
          <span className="siteBrandTitle">Premier League</span>
        </span>
      </Link>

      <PrimaryNav isAdmin={isAdmin} />

      <div className="siteHeaderRight">
        <div className={`siteStatus ${statusModifier}`} aria-label={statusLabel}>
          <span className="statusDot" aria-hidden="true" />
          <span>{statusLabel}</span>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
