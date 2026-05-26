import "./community-fab.css";

const EPL_WHATSAPP_URL = "https://tinyurl.com/EPLPublic";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 2A10 10 0 0 0 3.04 16.41L2 22l5.69-1.04A10 10 0 1 0 12 2zm5.42 14.4c-.23.64-1.36 1.22-1.87 1.27-.5.05-.97.21-3.27-.69-2.78-1.08-4.55-3.89-4.69-4.08-.13-.18-1.13-1.5-1.13-2.86 0-1.36.72-2.03.97-2.31.25-.27.55-.34.73-.34l.53.01c.17 0 .4-.07.62.47.23.55.79 1.91.86 2.05.07.14.12.3.02.48-.1.18-.14.3-.28.46-.14.16-.3.36-.43.49-.14.13-.29.28-.13.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.22 2.19 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.13.45.2.52.31.07.11.07.64-.16 1.27z"/>
    </svg>
  );
}

export function CommunityFab() {
  return (
    <a
      href={EPL_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="communityFab"
      aria-label="Join the EPL WhatsApp community (opens in a new tab)"
    >
      <span className="communityFabIcon" aria-hidden="true">
        <WhatsAppIcon />
      </span>
      <span className="communityFabLabel">Join EPL Community</span>
    </a>
  );
}
