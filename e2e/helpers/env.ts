/**
 * Test environment configuration.
 *
 * Credentials are read from env vars only — never hardcoded. The repo's
 * secret-scan (verify.yml) rejects PRs that paste the bootstrap admin password
 * into source files. Set these in your shell or a local `.env` (gitignored).
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing ${name} env var. Set it before running the e2e suite — see e2e/README.md.`,
    );
  }
  return v;
}

export const ENV = {
  baseUrl:       process.env.BASE_URL          ?? "http://localhost:3000",
  adminEmail:    process.env.E2E_ADMIN_EMAIL   ?? "admin@epl.local",
  /** Read lazily so tests that don't log in (e.g. anonymous-only specs) can run without it. */
  get adminPassword() { return required("E2E_ADMIN_PASSWORD"); },
} as const;
