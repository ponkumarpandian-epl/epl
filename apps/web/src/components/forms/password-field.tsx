"use client";
import { useId, useState } from "react";
import "./forms.css";

interface Props {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M16.5 16.5C14.95 17.5 13.5 18 12 18 5 18 2 11 2 11a18.5 18.5 0 0 1 4.7-5.4" />
      <path d="M9.9 5.2A10.2 10.2 0 0 1 12 5c7 0 10 7 10 7a18.5 18.5 0 0 1-2.8 3.7" />
    </svg>
  );
}

export function PasswordField({ name, label, placeholder, required, autoComplete = "new-password", defaultValue, hint, error }: Props) {
  const [show, setShow] = useState(false);
  const id      = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId  = hint  ? `${id}-hint`  : undefined;
  return (
    <div className={`field${error ? " fieldHasError" : ""}`}>
      <label htmlFor={id} className="fieldLabel">{label}{required ? " *" : ""}</label>
      <div className="fieldInputWrap">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          className="fieldInput"
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          style={{ paddingRight: 48 }}
          aria-invalid={!!error || undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        />
        <button
          type="button"
          className="pwToggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {hint  && <span id={hintId}  className="fieldHint">{hint}</span>}
      {error && <span id={errorId} className="fieldError">{error}</span>}
    </div>
  );
}
