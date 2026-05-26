#!/usr/bin/env node
// scripts/verify-secrets.mjs
// Scans tracked files for known dev passwords / hostnames.
// Mirrors the CI rule in .github/workflows/verify.yml so the local pre-commit
// hook fails fast with the same signal CI would.

import { spawnSync } from "node:child_process";

const PATTERNS = [
  "password@123",                // user's local SA password
  "Admin_Bootstrap_Passw0rd",    // bootstrap admin
  "Epl_Dev_Passw0rd",            // docker dev default
  "USWHGA4VF2\\\\LOCALHOST",     // hostname (escaped backslash for regex)
].join("|");

// Files where we expect to LEGITIMATELY mention these patterns
// (docs about secret rotation, recovery instructions, etc.).
const EXCLUDE_PATHS = [
  ":!SECRETS.md",
  ":!CONTRIBUTING.md",              // documents the patterns themselves
  ":!plan/",
  ":!.github/workflows/",
  ":!scripts/verify-secrets.mjs",   // the patterns array above
];

const args = ["grep", "-nE", PATTERNS, "--", ...EXCLUDE_PATHS];
const r = spawnSync("git", args, { encoding: "utf8" });

if (r.error) {
  console.error("✗ secret scan failed:", r.error.message);
  process.exit(2);
}

if (r.stdout && r.stdout.trim().length > 0) {
  console.error("✗ Known dev-secret pattern found in tracked source:");
  console.error(r.stdout);
  console.error("");
  console.error("  Move the credential to user-secrets (or .env), then remove the value from the file.");
  console.error("  See SECRETS.md for the workflow.");
  process.exit(1);
}

console.log("✓ secret-scan clean");
