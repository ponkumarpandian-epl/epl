import {
  FORMAT_LABEL,
  type TournamentCategoryDto,
} from "@/lib/tournaments";
import { getAdminBracketByParent } from "@/lib/brackets";
import { BracketView } from "@/components/bracket/bracket-view";
import { SeedTable } from "./seed-table";
import {
  createBracketAction,
  regenerateBracketAction,
  publishBracketAction,
} from "./actions";

interface BracketSectionProps {
  tournamentId: string;
  category:     TournamentCategoryDto;
}

/** Server component — fetches the bracket for a category and renders create/edit/publish controls. */
export async function BracketSection({ tournamentId, category }: BracketSectionProps) {
  const bracket = await getAdminBracketByParent("TournamentCategory", category.id);

  const noConfirmed = category.confirmedEntries === 0;
  const tooFewToDraw = category.confirmedEntries < 2;

  return (
    <section className="adminTournFormCard adminBracketCard" style={{ marginTop: 24, maxWidth: 1100 }}>
      <header className="adminBracketHeader">
        <div>
          <h2>{FORMAT_LABEL[category.format]} bracket</h2>
          <p className="help" style={{ marginBottom: 0 }}>
            Single-elimination knockout drawn from <b>{category.confirmedEntries}</b> confirmed
            {" "}entr{category.confirmedEntries === 1 ? "y" : "ies"}.
            {bracket?.isPublished
              ? <> · <span className="adminBracketStatus is-published">Published</span></>
              : <> · <span className="adminBracketStatus">Draft</span></>}
          </p>
        </div>
      </header>

      {!bracket ? (
        // No bracket yet — show the create button.
        <div className="adminBracketEmpty">
          {tooFewToDraw ? (
            <p>Confirm at least 2 entries before generating a draw.</p>
          ) : (
            <form action={createBracketAction}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <input type="hidden" name="categoryId"   value={category.id} />
              <button type="submit" className="adminBtn adminBtnPrimary">
                Generate bracket (Single Elimination)
              </button>
              <p className="adminBracketHint">
                Pulls the {category.confirmedEntries} confirmed entr{category.confirmedEntries === 1 ? "y" : "ies"} and seeds them by their admin-assigned seed (lowest first; unseeded go last).
              </p>
            </form>
          )}
        </div>
      ) : (
        <>
          {/* Live SVG preview */}
          <BracketView bracket={bracket} />

          {/* Editable seed list + admin actions */}
          <div className="adminBracketActions">
            <SeedTable
              tournamentId={tournamentId}
              bracketId={bracket.id}
              categoryId={category.id}
              participants={bracket.participants.filter((p) => !p.isBye)}
            />

            <aside className="adminBracketAside">
              <form action={regenerateBracketAction}>
                <input type="hidden" name="tournamentId" value={tournamentId} />
                <input type="hidden" name="bracketId"    value={bracket.id} />
                <input type="hidden" name="categoryId"   value={category.id} />
                <button type="submit" className="adminBtn adminBtnGhost" disabled={noConfirmed}>
                  Regenerate from confirmed entries
                </button>
                <p className="adminBracketHint">
                  Wipes the current draw and reseeds from the latest <b>{category.confirmedEntries}</b>
                  {" "}confirmed entr{category.confirmedEntries === 1 ? "y" : "ies"}. Refuses if any match has started.
                </p>
              </form>

              <form action={publishBracketAction}>
                <input type="hidden" name="tournamentId" value={tournamentId} />
                <input type="hidden" name="bracketId"    value={bracket.id} />
                <input type="hidden" name="publish"      value={String(!bracket.isPublished)} />
                <button
                  type="submit"
                  className={`adminBtn ${bracket.isPublished ? "adminBtnGhost" : "adminBtnGold"}`}
                >
                  {bracket.isPublished ? "Unpublish bracket" : "Publish bracket"}
                </button>
                <p className="adminBracketHint">
                  {bracket.isPublished
                    ? "Visible on the public tournament page right now."
                    : "Hidden from the public until you publish."}
                </p>
              </form>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
