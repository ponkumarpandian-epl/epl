"use client";
import { useFormStatus } from "react-dom";
import "./forms.css";

export function SubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btnPrimary" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
