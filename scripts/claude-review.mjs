#!/usr/bin/env node
// scripts/claude-review.mjs
// Local code review driven by Claude Code (https://github.com/anthropics/claude-code).
// Invokes the `code-reviewer` subagent defined in .claude/agents/code-reviewer.md
// against the current pending changes (uncommitted + staged + commits ahead of main).
//
// Usage:
//   npm run review               # default: review pending changes
//   npm run review -- "<hint>"   # narrow review (e.g. "review the seasons feature")
//
// Requires: `claude` CLI on PATH and an authenticated session (`claude login`)
// or ANTHROPIC_API_KEY in the environment. Both are documented in CLAUDE.md.

import { spawnSync } from "node:child_process";

const hint = process.argv.slice(2).join(" ").trim();

const prompt = hint
  ? `Use the code-reviewer subagent to review my pending changes. Hint from caller: ${hint}. Follow the agent's standard report format exactly.`
  : `Use the code-reviewer subagent to review my pending changes (uncommitted diff + staged + commits ahead of main). Follow the agent's standard report format exactly.`;

console.log("── claude code-review ────────────────────────────────────────");
console.log(`▶ ${hint ? `scoped: "${hint}"` : "scope: pending changes"}`);
console.log("");

const probe = spawnSync("claude", ["--version"], {
  shell: true,
  stdio: "ignore",
});
if ((probe.status ?? 1) !== 0) {
  console.error("✗ `claude` CLI not found on PATH.");
  console.error("  Install: npm install -g @anthropic-ai/claude-code");
  console.error("  Auth:    claude login  (or set ANTHROPIC_API_KEY)");
  console.error("  Docs:    https://github.com/anthropics/claude-code");
  process.exit(1);
}

const result = spawnSync(
  "claude",
  ["-p", prompt, "--output-format", "text"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 0);
