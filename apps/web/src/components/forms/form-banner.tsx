import "./forms.css";

function AlertIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="formBannerIcon"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9"  x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function FormBanner({
  kind = "error",
  title,
  children,
}: {
  kind?: "error";
  title?: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div role="alert" aria-live="assertive" className={`formBanner ${kind === "error" ? "formBannerError" : ""}`}>
      <AlertIcon />
      <div className="formBannerBody">
        <strong className="formBannerTitle">{title ?? "Something went wrong"}</strong>
        <span className="formBannerText">{children}</span>
      </div>
    </div>
  );
}
