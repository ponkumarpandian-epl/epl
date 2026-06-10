import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

// Load credentials from a gitignored .env in this folder. Variables already
// present in the shell win — useful when CI passes them in directly.
dotenv.config({ path: path.resolve(__dirname, ".env") });

/**
 * Playwright config for the EPL e2e suite.
 *
 * Assumes `npm run dev` is already running locally (web on :3000, API on :8080
 * proxied through Next). To override the target URL, set BASE_URL in the env.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",

  // Specs in this suite mutate the dev DB (real tournaments / entries / brackets
  // get created). Tests within a file are SERIAL so the create→register→confirm
  // chain stays coherent; files run sequentially too — keeps the log readable
  // and avoids fighting for the admin session.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Per-test budget. Generous because some specs chain create-tournament +
  // multiple registrations + bracket generation, and Next.js dev (Turbopack)
  // can spend 20s+ compiling an admin page when the server's been warm a while.
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace:       "retain-on-failure",
    screenshot:  "only-on-failure",
    video:       "retain-on-failure",
    // Don't slow down for animations that are already fast in this app.
    actionTimeout: 10_000,
    // Match the dev viewport most users hit.
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
