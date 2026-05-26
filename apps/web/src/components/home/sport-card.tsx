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
  /** Show a "Registration closed" pill instead of the Register button. */
  registrationOpen?: boolean;
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function formatFee(rupees: number) {
  return "₹" + rupees.toLocaleString("en-IN");
}

export function SportCard({
  sport, title, date, pills, feeRupees, contacts, image,
  seasonGameId, registrationOpen = true,
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
            <span className="registerBtn registerBtnClosed" role="status">
              <svg className="closedIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Registration closed</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
