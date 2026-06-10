import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ENV } from "./env";

/**
 * Sign in as the bootstrap admin via the public login form.
 *
 * Each test that calls this gets its own session, scoped to its browser context.
 * If we ever want to share auth state across tests, switch to Playwright's
 * `storageState` pattern — for now the login is fast enough that re-running it
 * per test isn't a real cost.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  // `name` attribute is the form's stable contract. Label text carries a
  // required-marker asterisk and Playwright's accessible-name normalisation
  // can be inconsistent with it.
  await page.getByLabel(/email or mobile/i).fill(ENV.adminEmail);
  await page.locator('input[name="password"]').fill(ENV.adminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Two-stage wait that produces a clear failure if login silently flops:
  //   1. URL leaves /login (the action's redirect actually fired).
  //   2. The user-menu button is rendered (the new page got a session cookie).
  // networkidle is unreliable under Next.js dev's HMR + SSE chatter, so we
  // wait on app-visible signals instead.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /account menu/i })).toBeVisible();
}

/** Sign out via the user menu; tolerant of being already logged out. */
export async function logout(page: Page): Promise<void> {
  await page.goto("/logout");
  // /logout's server action POSTs /identity/logout then redirects to /.
  await page.waitForURL("/", { timeout: 10_000 }).catch(() => { /* ignore */ });
}
