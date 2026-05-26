import "./forms.css";

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url";
  pattern?: string;
  maxLength?: number;
  readOnly?: boolean;
}

export function Field({
  name, label, type = "text", placeholder, defaultValue, hint, error,
  required, autoComplete, inputMode, pattern, maxLength, readOnly,
}: FieldProps) {
  const id = `f-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  const hintId  = hint  ? `${id}-hint`  : undefined;
  return (
    <div className={`field${error ? " fieldHasError" : ""}`}>
      <label htmlFor={id} className="fieldLabel">{label}{required ? " *" : ""}</label>
      <div className="fieldInputWrap">
        <input
          id={id}
          name={name}
          type={type}
          className="fieldInput"
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          pattern={pattern}
          maxLength={maxLength}
          readOnly={readOnly}
          aria-invalid={!!error || undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        />
      </div>
      {hint  && <span id={hintId}  className="fieldHint">{hint}</span>}
      {error && <span id={errorId} className="fieldError">{error}</span>}
    </div>
  );
}
