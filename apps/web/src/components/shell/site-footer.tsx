import Link from "next/link";
import "../home/home.css";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footerInner">
        <div>© 2026 Electronic-City Premier League</div>
        <div className="footerCenter">
          <a href="https://www.e-citypremierleague.in" target="_blank" rel="noopener noreferrer">
            www.e-citypremierleague.in
          </a>
        </div>
        <div className="footerContacts">
          <Link href="/#gallery">Gallery</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
