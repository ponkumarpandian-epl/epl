import Image from "next/image";
import Link from "next/link";
import "./home.css";

export type Sport = "cricket" | "badminton" | "volleyball";

export interface Contact {
  name: string;
  phoneDisplay: string;
  phoneE164: string;
}

export interface SportCardProps {
  sport: Sport;
  title: string;
  date: React.ReactNode;
  pills: string[];
  feeRupees: number;
  contacts: Contact[];
  image: string;
  /** Optional override — when provided, the inner Register link encodes the seasonGameId. */
  seasonGameId?: string;
  /** WhatsApp community link (SeasonGame override falls back to Game default). */
  whatsAppGroupUrl?: string;
  /** Show a "Registration closed" pill instead of the Register button. */
  registrationOpen?: boolean;
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function formatFee(rupees: number) {
  return "₹" + rupees.toLocaleString("en-IN");
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2A10 10 0 0 0 3.04 16.41L2 22l5.69-1.04A10 10 0 1 0 12 2zm5.42 14.4c-.23.64-1.36 1.22-1.87 1.27-.5.05-.97.21-3.27-.69-2.78-1.08-4.55-3.89-4.69-4.08-.13-.18-1.13-1.5-1.13-2.86 0-1.36.72-2.03.97-2.31.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.07.62.47.23.55.79 1.91.86 2.05.07.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.43.49-.14.13-.29.28-.13.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.22 2.19 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.13.45.2.52.31.07.11.07.64-.16 1.27z"/>
    </svg>
  );
}

export function SportCard({
  sport, title, date, pills, feeRupees, contacts, image,
  seasonGameId, whatsAppGroupUrl, registrationOpen = true,
}: SportCardProps) {
  const registerHref = seasonGameId
    ? `/teams/register?sport=${sport}&seasonGameId=${seasonGameId}`
    : `/teams/register?sport=${sport}`;

  return (
    <article className={`sportCard ${sport}`}>
      {registrationOpen && (
        <Link
          href={registerHref}
          className="absolute inset-0 z-[5]"
          style={{ position: "absolute", inset: 0, zIndex: 5 }}
          aria-label={`Register a ${title} team`}
        />
      )}
      <div className="sportMeta">
        <h2 className="sportName">{title}</h2>
        <div className="sportDate">{date}</div>
        <div className="sportPills">
          {pills.map((p) => (
            <span key={p} className="sportPill">{p}</span>
          ))}
        </div>
        <div className="sportFee">
          <span className="label">Entry fee</span>
          <span className="amount">{formatFee(feeRupees)}</span>
          <span className="per">/ team</span>
        </div>
      </div>

      <div className="sportVisual">
        <Image
          className="sportSilhouette"
          src={image}
          alt=""
          fill
          sizes="(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 40vw"
        />
        <div className="streak" aria-hidden="true" />
      </div>

      <div className="sportAction" style={{ position: "relative", zIndex: 10 }}>
        <div className="contactsLabel">Contact with</div>
        <div className="contactList">
          {contacts.map((c) => (
            <div key={c.phoneE164} className="contactItem">
              <div className="avatar" aria-hidden="true">{initial(c.name)}</div>
              <div className="contactText">
                <span className="contactName">{c.name}</span>
                <a href={`tel:${c.phoneE164}`} className="contactPhone">{c.phoneDisplay}</a>
              </div>
            </div>
          ))}
        </div>

        <div className="sportActionRow">
          {registrationOpen ? (
            <Link href={registerHref} className="registerBtn" role="button">
              <span>Register Team</span>
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          ) : (
            <span className="registerBtn registerBtnClosed" aria-disabled="true" role="status">
              <svg className="closedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Registration closed</span>
            </span>
          )}

          {whatsAppGroupUrl && (
            <a
              href={whatsAppGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsappBtn"
              aria-label={`Join the ${title} WhatsApp group`}
            >
              <WhatsAppIcon />
              <span>WhatsApp Group</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
