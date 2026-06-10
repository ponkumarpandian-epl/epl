/**
 * Helpers that produce unique-per-run names + slugs.
 *
 * Tournaments are keyed by slug (unique constraint in the DB), so collisions
 * between back-to-back runs would fail. We tag everything with a timestamp +
 * a per-process counter, and prefix with [E2E] so accidental fixtures in the
 * shared dev DB are easy to spot and delete.
 */

let counter = 0;

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export function uniqueSlug(label: string): string {
  counter += 1;
  return `e2e-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${timestamp()}-${counter}`;
}

export function uniqueTournamentName(label: string): string {
  return `[E2E] ${label} ${timestamp()}-${counter}`;
}

export function uniqueMobile(): string {
  // 10-digit Indian mobile in E.164 — random last 7 digits.
  const tail = String(Math.floor(1_000_000 + Math.random() * 8_999_999));
  return `+91999${tail}`;
}
