/**
 * T-3 — Bracket subsystem (SingleElim only).
 *
 * Validates the iteration's contract:
 *  - Admin can generate a bracket from confirmed entries.
 *  - BYE auto-advance: with an odd-power participant count, top seeds get a
 *    BYE in round 1 and their slot in round 2 is pre-populated.
 *  - Reseeding rebuilds the draw with the new ordering.
 *  - Publishing makes the bracket SVG appear on the public tournament page.
 *
 * Backend flow used to set up the fixtures: admin creates tournament → registers
 * several entries through the same public form a real user would use → confirms
 * each in the admin panel → generates the bracket.
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { createPublishedTournament, type CreatedTournament } from "../helpers/tournament";
import { uniqueMobile } from "../helpers/unique";

test.describe.configure({ mode: "serial" });

const ENTRIES = ["Alpha One", "Bravo Two", "Charlie Three", "Delta Four"];

async function registerAnonymousSingles(page: Page, slug: string, name: string, mobile: string) {
  await page.goto(`/tournaments/${slug}/register?category=Singles`);
  await page.getByLabel(/^your name/i).fill(name);
  await page.getByLabel(/^mobile/i).fill(mobile);
  await page.getByRole("button", { name: /submit entry/i }).click();
  await page.waitForURL(/registered=1/);
}

async function confirmAllEntries(page: Page, tournamentId: string, names: readonly string[]) {
  await page.goto(`/admin/tournaments/${tournamentId}`);
  const panel = page.locator("section.adminEntriesCard").filter({ hasText: /singles entries/i });

  // Iterate by player name rather than "the first remaining Confirm button".
  // The name-scoped row is stable across the re-renders that the server-action
  // revalidation triggers; a count-based loop races the layout shift the
  // entries counter causes and Playwright flags it as "element not stable".
  for (const name of names) {
    const row        = panel.locator("tr.adminEntryRow").filter({ hasText: name });
    const confirmBtn = row.getByRole("button", { name: /^confirm$/i });

    // Skip rows that are somehow already Confirmed (re-runs, leftover state).
    if (await confirmBtn.count() === 0) continue;

    // Anchor the row in the viewport before clicking — narrows the surface for
    // the dev-server's recompile-driven layout shift to disrupt the action.
    await row.scrollIntoViewIfNeeded();
    await confirmBtn.click();

    // The status pill flipping is the app-level "done" signal. Auto-waits past
    // any Next.js dev re-render without depending on networkidle (which never
    // resolves under HMR + SSE traffic).
    await expect(row.locator(".adminEntryStatus-confirmed")).toBeVisible({ timeout: 15_000 });
  }
}

test.describe("T-3 brackets · SingleElim", () => {
  let tournament: CreatedTournament;

  test("admin can generate a bracket from 4 confirmed entries", async ({ page, browser }) => {
    // 1. Create a published tournament.
    await loginAsAdmin(page);
    tournament = await createPublishedTournament(page, {
      label:      "Knockout Four",
      minEntries: 2,
      maxEntries: 16,
    });

    // 2. Register 4 entries via the anonymous public form.
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    for (const name of ENTRIES) {
      await registerAnonymousSingles(anonPage, tournament.slug, name, uniqueMobile());
    }
    await anon.close();

    // 3. Confirm all of them in the admin panel.
    await confirmAllEntries(page, tournament.id, ENTRIES);

    // 4. Generate the bracket.
    const bracketCard = page.locator("section.adminBracketCard").first();
    await bracketCard.getByRole("button", { name: /generate bracket/i }).click();
    // No networkidle: the SVG-visible assertion below auto-waits for the
    // server action + revalidation to materialise the bracket.
    await expect(bracketCard.locator("svg")).toBeVisible();

    // 5. The bracket SVG renders with all four names.
    for (const name of ENTRIES) {
      // Bracket text nodes use the SVG <text> element; getByText matches via
      // text content regardless of element type.
      await expect(bracketCard.getByText(name).first()).toBeVisible();
    }

    // Two rounds expected: Semifinals + Final.
    await expect(bracketCard.locator("text").filter({ hasText: /SEMIFINALS/ })).toHaveCount(1);
    await expect(bracketCard.locator("text").filter({ hasText: /^FINAL$/ })).toHaveCount(1);
  });

  test("publish flips the bracket onto the public detail page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/tournaments/${tournament.id}`);

    const bracketCard = page.locator("section.adminBracketCard").first();
    await bracketCard.getByRole("button", { name: /^publish bracket$/i }).click();
    // The "Published" badge appearing is the app-level signal — networkidle
    // wait is redundant and brittle under Next.js dev's HMR / SSE chatter.
    await expect(bracketCard.getByText("Published")).toBeVisible();

    // Public tournament detail page now shows the bracket section.
    await page.goto(`/tournaments/${tournament.slug}?category=Singles`);
    const publicBracket = page.locator("section.tournBracketSection");
    await expect(publicBracket).toBeVisible();
    for (const name of ENTRIES) {
      await expect(publicBracket.getByText(name).first()).toBeVisible();
    }
  });

  test("reseed via the seed table changes the draw ordering", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/tournaments/${tournament.id}`);

    const bracketCard = page.locator("section.adminBracketCard").first();
    // Locate the seed input for "Delta Four" — last by registration order — and
    // promote it to seed 1.
    const deltaRow = bracketCard.locator("li.adminBracketSeedRow").filter({ hasText: "Delta Four" });
    await deltaRow.locator("input[type=number]").fill("1");

    // Demote the prior seed-1 to seed 4 so the constraint set stays valid.
    const alphaRow = bracketCard.locator("li.adminBracketSeedRow").filter({ hasText: "Alpha One" });
    await alphaRow.locator("input[type=number]").fill("4");

    const saveBtn = bracketCard.getByRole("button", { name: /save seeds/i });
    await saveBtn.click();

    // Wait for the form's pending state to clear — useTransition disables the
    // button while the server action is in flight, so its re-enabled state is
    // the "save completed" signal.
    await expect(saveBtn).toBeEnabled({ timeout: 30_000 });

    // Hard reload to bypass any dev-mode revalidation hiccup — guarantees the
    // page is reading the freshly-saved seeds from the server, not stale state.
    await page.goto(`/admin/tournaments/${tournament.id}`);

    // After save, Delta Four should be top of the (server-sorted) seed list.
    const firstSeedRow = page
      .locator("section.adminBracketCard")
      .first()
      .locator("li.adminBracketSeedRow")
      .first();
    await expect(firstSeedRow).toContainText("Delta Four");
  });

  test("3 confirmed entries → BYE auto-advance into the final", async ({ page, browser }) => {
    // New tournament for this scenario so the count is exactly 3.
    await loginAsAdmin(page);
    const odd = await createPublishedTournament(page, {
      label:      "Bye Test",
      minEntries: 2,
      maxEntries: 16,
    });

    const anon  = await browser.newContext();
    const pg    = await anon.newPage();
    await registerAnonymousSingles(pg, odd.slug, "Echo Five",   uniqueMobile());
    await registerAnonymousSingles(pg, odd.slug, "Foxtrot Six", uniqueMobile());
    await registerAnonymousSingles(pg, odd.slug, "Golf Seven",  uniqueMobile());
    await anon.close();

    await confirmAllEntries(page, odd.id, ["Echo Five", "Foxtrot Six", "Golf Seven"]);

    const bracketCard = page.locator("section.adminBracketCard").first();
    await bracketCard.getByRole("button", { name: /generate bracket/i }).click();
    // Wait for the bracket to materialise — networkidle is unreliable under
    // Next.js dev; the SVG appearing is the deterministic signal.
    await expect(bracketCard.locator("svg")).toBeVisible();

    // bracketSize = 4, so we expect: Semifinals + Final. The top seed gets a BYE,
    // and the bracket renders "BYE" as a participant name in one of the slots.
    await expect(bracketCard.getByText(/^BYE$/).first()).toBeVisible();

    // At least one match should show the W/O status (the BYE auto-advance).
    await expect(bracketCard.locator("text").filter({ hasText: /^W\/O$/ }).first()).toBeVisible();
  });
});
