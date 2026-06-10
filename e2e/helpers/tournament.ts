import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { uniqueSlug, uniqueTournamentName } from "./unique";

export interface CreatedTournament {
  id:   string;     // route id from /admin/tournaments/[id]
  name: string;
  slug: string;
}

/**
 * Creates a draft tournament with a single Singles category, then publishes it.
 *
 * Categories: the form starts with Singles + MensDoubles by default. We drop
 * the second row so the test focuses on Singles. Min/max are bumped to allow
 * BYE / odd-count assertions later in T-3.
 *
 * Returns the tournament's id (extracted from the URL after create) so callers
 * can navigate back to the admin edit page directly.
 */
export async function createPublishedTournament(
  page: Page,
  opts: { label: string; minEntries?: number; maxEntries?: number } = { label: "Smashify" },
): Promise<CreatedTournament> {
  const name = uniqueTournamentName(opts.label);
  const slug = uniqueSlug(opts.label);

  await page.goto("/admin/tournaments/new");

  // Sanity: confirm we landed on the create page, not got bounced to /login
  // by a stale / missing auth cookie. Surfaces the real failure cause instead
  // of a generic "input never appeared" timeout downstream.
  await expect(page).toHaveURL(/\/admin\/tournaments\/new/);

  // Use input[name=…] selectors throughout — label text carries a required-marker
  // asterisk and Playwright's accessible-name normalisation can drop trailing
  // glyphs. The `name` attribute is the form's contract with the server action.
  const nameInput = page.locator('input[name="name"]');
  // Generous timeout — Next.js dev (Turbopack) can take 20s+ to compile an
  // admin page after the server has been warm for a few minutes (HMR / memory
  // pressure builds up). Falling back on the test-level 30s budget.
  await nameInput.waitFor({ state: "visible", timeout: 25_000 });
  await nameInput.fill(name);

  // Slug auto-fills from name; overwrite to a known value.
  await page.locator('input[name="slug"]').fill(slug);

  // Drop the auto-included "MensDoubles" row so we only have Singles.
  const removeButtons = page.getByRole("button", { name: /remove category/i });
  const count = await removeButtons.count();
  if (count >= 2) {
    // Remove from the end so indices don't shift under us.
    await removeButtons.nth(count - 1).click();
  }

  // Bump min/max on the remaining Singles row.
  if (opts.minEntries !== undefined) {
    await page.locator('input[name="cat-0-min"]').fill(String(opts.minEntries));
  }
  if (opts.maxEntries !== undefined) {
    await page.locator('input[name="cat-0-max"]').fill(String(opts.maxEntries));
  }

  // Toggle the styled "Publish" switch ON. The checkbox is sr-only-hidden so a
  // direct click on the input is unreliable — click the associated label.
  await setToggle(page, "publish", true);
  // Registration toggle is on by default; assert it without mutating.
  await expect(page.locator('input[name="regOpen"]')).toBeChecked();

  await page.getByRole("button", { name: /create tournament/i }).click();

  // Land on /admin/tournaments/[id]. Extract the id from the URL.
  await page.waitForURL(/\/admin\/tournaments\/[0-9a-f-]+/i, { timeout: 15_000 });
  const match = page.url().match(/\/admin\/tournaments\/([0-9a-f-]+)/i);
  if (!match) throw new Error(`Could not extract tournament id from URL: ${page.url()}`);

  return { id: match[1], name, slug };
}

/**
 * Find the Singles category id by walking the rendered category table —
 * needed when the test wants to assert UI state for one specific category.
 */
export async function readSinglesCategoryId(page: Page, tournamentId: string): Promise<string> {
  await page.goto(`/admin/tournaments/${tournamentId}`);
  // The Entries panel header reads "Singles entries"; the surrounding section's
  // forms include hidden categoryId inputs. Lift one out via DOM lookup.
  const hiddenInput = page
    .locator('section.adminEntriesCard')
    .filter({ hasText: /Singles entries/ })
    .locator('input[type="hidden"][name="entryId"]')
    .first();
  // If no entries exist yet, fall back to scraping the bracket section's hidden categoryId.
  if ((await hiddenInput.count()) > 0) {
    // Walk up to a sibling that carries categoryId.
    const sibling = page
      .locator('section.adminEntriesCard')
      .filter({ hasText: /Singles entries/ });
    const catInput = sibling.locator('input[type="hidden"][name="entryId"]').first();
    // We can't read categoryId from EntriesSection directly — read from the
    // bracket section instead, which has it.
    void catInput;
  }
  const bracketCategoryInput = page
    .locator('section.adminBracketCard')
    .first()
    .locator('input[type="hidden"][name="categoryId"]')
    .first();
  return (await bracketCategoryInput.inputValue()).trim();
}

/** Locator for one specific entry's row in the admin Entries panel, by player name. */
export function adminEntryRow(page: Page, playerName: string): Locator {
  return page.locator("tr.adminEntryRow").filter({ hasText: playerName });
}

/**
 * Set a styled toggle checkbox (the .adminTournToggle pattern) to the given state.
 * The native checkbox is visually hidden (sr-only clip) and is only reliably
 * flipped by clicking its associated <label htmlFor>, not the input itself.
 */
async function setToggle(page: Page, inputName: string, desired: boolean): Promise<void> {
  const input = page.locator(`input[name="${inputName}"]`);
  const current = await input.isChecked();
  if (current === desired) return;

  // The styled toggle label has `htmlFor` matching the input's id (= inputName in this form).
  const label = page.locator(`label.adminTournToggle[for="${inputName}"]`);
  await label.click();

  // Verify the click actually toggled — clearer than a silent no-op.
  await expect(input).toBeChecked({ checked: desired });
}
