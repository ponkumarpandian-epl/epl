"use client";
import { useActionState } from "react";
import { FORMAT_LABEL, type CategoryFormat } from "@/lib/tournaments";
import { addCategoryAction, type AddCategoryState } from "./actions";

const ALL_FORMATS: CategoryFormat[] = ["Singles", "MensDoubles", "WomensDoubles", "MixedDoubles"];

export function AddCategoryForm({
  tournamentId,
  usedFormats,
}: {
  tournamentId: string;
  usedFormats: string[];
}) {
  const used = new Set(usedFormats);
  const available = ALL_FORMATS.filter((f) => !used.has(f));

  const [state, formAction, pending] = useActionState<AddCategoryState | undefined, FormData>(
    (prev, fd) => addCategoryAction(tournamentId, prev, fd),
    undefined,
  );

  if (available.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--bone-fade)", letterSpacing: "0.06em", marginTop: 12 }}>
        All four formats already attached. Remove one above to add it back with different settings.
      </p>
    );
  }

  return (
    <form action={formAction} className="catRow" style={{ marginTop: 4 }}>
      <div>
        <div className="catLabel">Name</div>
        <input name="name" placeholder="Men's Doubles" defaultValue={state?.values?.name ?? ""} required />
        {state?.fieldErrors?.name && <span className="adminTournFieldErr">{state.fieldErrors.name}</span>}
      </div>

      <div>
        <div className="catLabel">Format</div>
        <select name="format" required defaultValue={state?.values?.format ?? available[0]}>
          {available.map((f) => (
            <option key={f} value={f}>{FORMAT_LABEL[f]}</option>
          ))}
        </select>
        {state?.fieldErrors?.format && <span className="adminTournFieldErr">{state.fieldErrors.format}</span>}
      </div>

      <div>
        <div className="catLabel">Min</div>
        <input name="min" type="number" min={2} max={256} defaultValue={state?.values?.min ?? "8"} />
        {state?.fieldErrors?.min && <span className="adminTournFieldErr">{state.fieldErrors.min}</span>}
      </div>

      <div>
        <div className="catLabel">Max</div>
        <input name="max" type="number" min={2} max={256} defaultValue={state?.values?.max ?? "16"} />
        {state?.fieldErrors?.max && <span className="adminTournFieldErr">{state.fieldErrors.max}</span>}
      </div>

      <div>
        <div className="catLabel">Fee ₹</div>
        <input name="fee" type="number" min={0} step={50} defaultValue={state?.values?.fee ?? "0"} />
        {state?.fieldErrors?.fee && <span className="adminTournFieldErr">{state.fieldErrors.fee}</span>}
      </div>

      <div>
        <div className="catLabel">&nbsp;</div>
        <button type="submit" className="adminBtn adminBtnPrimary" style={{ height: 38, padding: "0 14px" }} disabled={pending}>
          {pending ? "…" : "+"}
        </button>
      </div>

      <input type="hidden" name="regOpen" value="on" />
    </form>
  );
}
