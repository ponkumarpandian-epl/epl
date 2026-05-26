import Link from "next/link";
import "./home.css";
import "./registration-closed.css";

function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function RegistrationClosedNotice({ seasonName }: { seasonName: string }) {
  return (
    <section className="closedNotice" aria-label={`${seasonName} registration is closed`}>
      <div className="closedNoticeIcon" aria-hidden="true">
        <LockIcon />
      </div>
      <div className="closedNoticeBody">
        <span className="closedNoticeEyebrow">Heads up</span>
        <h2 className="closedNoticeTitle">Registration is closed for {seasonName}</h2>
        <p className="closedNoticeLead">
          The window to register new teams has ended. Sport details below stay live so you can still reach out
          to the coordinators — they&apos;ll help with last-minute queries, late additions (where possible),
          or questions about Season 3.
        </p>
        <div className="closedNoticeActions">
          <Link href="/contact" className="closedNoticeBtn closedNoticeBtnPrimary">
            <MailIcon />
            <span>Contact organisers</span>
            <ArrowIcon />
          </Link>
          <a href="#sports" className="closedNoticeBtn closedNoticeBtnGhost">
            View sport details
          </a>
        </div>
      </div>
    </section>
  );
}
