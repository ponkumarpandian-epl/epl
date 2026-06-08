import {
  FORMAT_LABEL,
  listAdminCategoryEntries,
  type AdminTournamentEntryDto,
  type TournamentCategoryDto,
} from "@/lib/tournaments";
import { setEntrySeedAction, setEntryStatusAction } from "./actions";

interface EntriesSectionProps {
  tournamentId: string;
  category:     TournamentCategoryDto;
}

/** Server component — fetches admin entry list for one category and renders the table. */
export async function EntriesSection({ tournamentId, category }: EntriesSectionProps) {
  const entries = await listAdminCategoryEntries(category.id);

  const confirmed = entries.filter((e) => e.status === "Confirmed").length;
  const pending   = entries.filter((e) => e.status === "Pending").length;
  const withdrawn = entries.filter((e) => e.status === "Withdrawn").length;

  return (
    <section className="adminTournFormCard adminEntriesCard" style={{ marginTop: 24, maxWidth: 900 }}>
      <header className="adminEntriesHeader">
        <div>
          <h2>{FORMAT_LABEL[category.format]} entries</h2>
          <p className="help" style={{ marginBottom: 0 }}>
            Seed and confirm each entry. Set status to <b>Confirmed</b> once payment / participation is locked.
          </p>
        </div>
        <div className="adminEntriesCounts" aria-label="Entry breakdown">
          <span className="entryCount entryCount-confirmed">{confirmed} confirmed</span>
          <span className="entryCount entryCount-pending">{pending} pending</span>
          {withdrawn > 0 && <span className="entryCount entryCount-withdrawn">{withdrawn} withdrawn</span>}
          <span className="entryCount entryCount-cap">
            {category.totalEntries}/{category.maxEntries} cap
          </span>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="adminEntriesEmpty" role="status">
          No entries yet. The public registration form lives at{" "}
          <code>/tournaments/&lt;slug&gt;/register?category={category.format}</code>.
        </div>
      ) : (
        <div className="adminEntriesTableWrap">
          <table className="adminEntriesTable">
            <thead>
              <tr>
                <th>Seed</th>
                <th>Player(s)</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <EntryRow key={e.id} entry={e} tournamentId={tournamentId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EntryRow({ entry, tournamentId }: { entry: AdminTournamentEntryDto; tournamentId: string }) {
  const withdrawn = entry.status === "Withdrawn";
  return (
    <tr className={`adminEntryRow adminEntryRow-${entry.status.toLowerCase()}`}>
      <td className="adminEntrySeedCell">
        <form action={setEntrySeedAction} className="adminEntrySeedForm">
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <input type="hidden" name="entryId"      value={entry.id} />
          <input
            type="number"
            name="seed"
            min={1}
            max={256}
            defaultValue={entry.seed ?? ""}
            aria-label={`Seed for ${entry.player1Name}`}
            className="adminEntrySeedInput"
          />
          <button type="submit" className="adminEntrySeedBtn" aria-label="Save seed">↵</button>
        </form>
      </td>
      <td>
        <div className="adminEntryNames">
          <span>{entry.player1Name}</span>
          {entry.player2Name && (
            <span>
              <span className="adminEntryPartnerArrow">+ </span>
              {entry.player2Name}
            </span>
          )}
          {entry.teamLabel && <span className="adminEntryTeam">“{entry.teamLabel}”</span>}
        </div>
      </td>
      <td className="adminEntryMobile">
        <div>{entry.player1Mobile}</div>
        {entry.player2Mobile && <div>{entry.player2Mobile}</div>}
      </td>
      <td>
        <span className={`adminEntryStatus adminEntryStatus-${entry.status.toLowerCase()}`}>
          {entry.status}
        </span>
      </td>
      <td className="adminEntryActions">
        {entry.status !== "Confirmed" && (
          <form action={setEntryStatusAction}>
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="entryId"      value={entry.id} />
            <input type="hidden" name="status"       value="Confirmed" />
            <button type="submit" className="adminEntryActionBtn adminEntryActionBtn-confirm">
              Confirm
            </button>
          </form>
        )}
        {entry.status === "Confirmed" && (
          <form action={setEntryStatusAction}>
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="entryId"      value={entry.id} />
            <input type="hidden" name="status"       value="Pending" />
            <button type="submit" className="adminEntryActionBtn">Move to Pending</button>
          </form>
        )}
        {!withdrawn ? (
          <form action={setEntryStatusAction}>
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="entryId"      value={entry.id} />
            <input type="hidden" name="status"       value="Withdrawn" />
            <button type="submit" className="adminEntryActionBtn adminEntryActionBtn-withdraw">
              Withdraw
            </button>
          </form>
        ) : (
          <form action={setEntryStatusAction}>
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="entryId"      value={entry.id} />
            <input type="hidden" name="status"       value="Pending" />
            <button type="submit" className="adminEntryActionBtn">Restore</button>
          </form>
        )}
      </td>
    </tr>
  );
}
