/**
 * T-2 — Tournament entries flow (happy path).
 *
 * Covers the iteration's main deliverables: an admin can spin up a published
 * tournament, anonymous + logged-in users can register, the per-category
 * counter updates, and the admin can seed + confirm entries.
 *
 * The whole spec runs serially against ONE freshly-created tournament so the
 * pieces tell a coherent story end-to-end. Each test depends on the previous
 * one's effect on the database.
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { createPublishedTournament, type CreatedTournament } from "../helpers/tournament";
import { uniqueMobile } from "../helpers/unique";

test.describe.configure({ mode: "serial" });

let tournament: CreatedTournament;
const player1Mobile = uniqueMobile();
const player1Name   = "Anand Test";

test.describe("T-2 entries · happy path", () => {
  test("admin creates + publishes a Singles tournament", async ({ page }) => {
    await loginAsAdmin(page);
    tournament = await createPublishedTournament(page, {
      label:      "Smashify Singles",
      minEntries: 2,
      maxEntries: 16,
    });

    // The freshly-created tournament should appear in the public list.
    await page.goto("/tournaments");
    await expect(page.getByRole("heading", { name: tournament.name })).toBeVisible();
  });

  test("anonymous visitor can register for Singles → entry shows on public list", async ({ browser }) => {
    // Fresh context = no cookie, so the visitor is treated as anonymous.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(`/tournaments/${tournament.slug}/register?category=Singles`);

    // Anonymous flow renders Player 1 inputs (no identity card).
    await page.getByLabel(/^your name/i).fill(player1Name);
    await page.getByLabel(/^mobile/i).fill(player1Mobile);
    await page.getByRole("button", { name: /submit entry/i }).click();

    // Lands on the detail page with the success banner.
    await page.waitForURL(/\/tournaments\/[\w-]+\?category=Singles&registered=1/);
    await expect(page.getByRole("status").filter({ hasText: /you'?re registered/i })).toBeVisible();

    // Entry appears in the public entries list (always, even when Pending).
    await expect(page.getByText(player1Name).first()).toBeVisible();

    // Counter increments to 1/16.
    await expect(page.getByText("1 / 16")).toBeVisible();

    await ctx.close();
  });

  test("logged-in admin sees identity card and can submit without typing name", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/tournaments/${tournament.slug}/register?category=Singles`);

    // Identity card replaces the Player 1 inputs.
    await expect(page.getByText(/registering as/i)).toBeVisible();
    await expect(page.getByLabel(/^your name/i)).toHaveCount(0);

    // The bootstrap admin doesn't carry a phoneNumber in seeded data — the
    // mobile field stays visible until they fill their profile. Skip the
    // submission in that case so the spec stays meaningful regardless of seed state.
    const mobileField = page.getByLabel(/^mobile/i);
    if (await mobileField.isVisible()) {
      await mobileField.fill(uniqueMobile());
    }

    await page.getByRole("button", { name: /submit entry/i }).click();
    await page.waitForURL(/registered=1/);
  });

  test("admin Entries panel shows the new entry as Pending; counter reflects it", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/tournaments/${tournament.id}`);

    // The Singles entries panel header is rendered first.
    const panel = page.locator('section.adminEntriesCard').filter({ hasText: /singles entries/i });
    await expect(panel).toBeVisible();

    // Anonymous registration lands as Pending.
    const row = panel.locator("tr.adminEntryRow").filter({ hasText: player1Name });
    await expect(row).toBeVisible();
    await expect(row.locator(".adminEntryStatus-pending")).toBeVisible();
  });

  test("admin can confirm the entry; status flips to Confirmed on public list too", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/tournaments/${tournament.id}`);

    const row = page
      .locator('section.adminEntriesCard')
      .filter({ hasText: /singles entries/i })
      .locator("tr.adminEntryRow")
      .filter({ hasText: player1Name });

    await row.getByRole("button", { name: /^confirm$/i }).click();

    // Admin row now shows Confirmed status.
    await expect(row.locator(".adminEntryStatus-confirmed")).toBeVisible();

    // Public list reflects the change after revalidation.
    await page.goto(`/tournaments/${tournament.slug}?category=Singles`);
    const publicRow = page
      .locator("li.tournEntryRow")
      .filter({ hasText: player1Name });
    await expect(publicRow.locator(".tournEntryStatus")).toHaveText(/confirmed/i);
  });

  test("admin can set a seed; the input persists across reload", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/admin/tournaments/${tournament.id}`);

    const row = page
      .locator('section.adminEntriesCard')
      .filter({ hasText: /singles entries/i })
      .locator("tr.adminEntryRow")
      .filter({ hasText: player1Name });

    const seedInput = row.locator('input[name="seed"]');
    await seedInput.fill("1");
    await row.getByRole("button", { name: /save seed/i }).click();

    // Reload and verify the seed survived.
    await page.goto(`/admin/tournaments/${tournament.id}`);
    const reloadedSeed = page
      .locator('section.adminEntriesCard')
      .filter({ hasText: /singles entries/i })
      .locator("tr.adminEntryRow")
      .filter({ hasText: player1Name })
      .locator('input[name="seed"]');
    await expect(reloadedSeed).toHaveValue("1");
  });
});
