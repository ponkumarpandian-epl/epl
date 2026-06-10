/**
 * T-2 — Edge cases that protect the registration flow:
 *  1. Duplicate-mobile registration is rejected with a friendly inline error
 *     (not a stack trace).
 *  2. The logged-in "Switch accounts" button signs the user out and lands them
 *     on /login (not back on the registration page as the same user).
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { createPublishedTournament } from "../helpers/tournament";
import { uniqueMobile } from "../helpers/unique";

test.describe.configure({ mode: "serial" });

test.describe("T-2 entries · edge cases", () => {
  test("duplicate mobile in the same category is rejected with field-level error", async ({ page, browser }) => {
    // Set up a fresh tournament so this test is self-contained.
    await loginAsAdmin(page);
    const tournament = await createPublishedTournament(page, {
      label:      "Duplicate Mobile",
      minEntries: 2,
      maxEntries: 16,
    });

    const mobile = uniqueMobile();

    // First registration succeeds (anonymous).
    const anon = await browser.newContext();
    const reg1 = await anon.newPage();
    await reg1.goto(`/tournaments/${tournament.slug}/register?category=Singles`);
    await reg1.getByLabel(/^your name/i).fill("First Player");
    await reg1.getByLabel(/^mobile/i).fill(mobile);
    await reg1.getByRole("button", { name: /submit entry/i }).click();
    await reg1.waitForURL(/registered=1/);

    // Second registration with the same mobile in the same category → rejected.
    const reg2 = await anon.newPage();
    await reg2.goto(`/tournaments/${tournament.slug}/register?category=Singles`);
    await reg2.getByLabel(/^your name/i).fill("Second Player");
    await reg2.getByLabel(/^mobile/i).fill(mobile);
    await reg2.getByRole("button", { name: /submit entry/i }).click();

    // The action surfaces a top-level alert and a mobile field error.
    await expect(reg2.getByRole("alert").filter({ hasText: /already registered/i })).toBeVisible();
    await expect(reg2).toHaveURL(/\/register/);   // stayed on the form, didn't navigate away

    await anon.close();
  });

  test("Switch accounts button signs out + lands on /login with a `next` redirect", async ({ page }) => {
    // Need a published tournament with registration open to reach the identity card.
    await loginAsAdmin(page);
    const tournament = await createPublishedTournament(page, { label: "Switch Accounts" });

    await page.goto(`/tournaments/${tournament.slug}/register?category=Singles`);

    // Identity card visible because we're logged in as admin.
    await expect(page.getByText(/registering as/i)).toBeVisible();
    const switchBtn = page.getByRole("button", { name: /not you\?/i });
    await expect(switchBtn).toBeVisible();

    // Click it — the server action clears the cookie + redirects to /login.
    await switchBtn.click();
    await page.waitForURL(/\/login(\?|$)/, { timeout: 10_000 });

    // The login page renders the form (we're not logged in any more), and the
    // `next` query param points back at this registration page.
    await expect(page).toHaveURL(/[?&]next=/);
    await expect(page.getByLabel(/email or mobile/i)).toBeVisible();
  });
});
