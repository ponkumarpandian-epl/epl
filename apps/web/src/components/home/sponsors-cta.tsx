import "./home.css";

export function SponsorsCta() {
  const subject = encodeURIComponent("Become a Sponsor — EPL Season 2 (2026)");
  return (
    <section className="sponsors" aria-label="Sponsorship">
      <div className="sponsorsCta">
        <div className="sponsorsCtaText">
          <span className="sponsorsCtaEyebrow">Partnership Opportunity</span>
          <h3 className="sponsorsCtaTitle">Want to support EPL?</h3>
        </div>
        <a
          href={`mailto:info.ecitypremierleague@gmail.com?subject=${subject}`}
          className="becomeSponsor"
          role="button"
        >
          Become a Sponsor
        </a>
      </div>
    </section>
  );
}
