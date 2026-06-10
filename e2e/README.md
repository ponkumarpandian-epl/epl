# EPL e2e suite

Playwright end-to-end tests for the iterations shipped in `feature/add-tournaments`:

- **T-2** — tournament entries (admin create + publish, anonymous + logged-in registration, admin Entries panel: confirm / seed / withdraw).
- **T-3** — bracket subsystem (generate from confirmed entries, BYE auto-advance, reseed, publish → public bracket SVG).

The suite assumes `npm run dev` (the API + Next.js web server) is already running on `http://localhost:3000`. Tests mutate the local dev database — they prefix every fixture with `[E2E]` and use unique slugs per run so leftover rows are easy to identify and don't collide between runs.

---

## One-time setup

```bash
# from the repo root
cd e2e
npm install
npx playwright install chromium
```

Provide the bootstrap admin password. Two equivalent paths:

**Option 1 (recommended for local dev) — `.env` file.** Copy the template and paste the password:

```bash
cp .env.example .env
# edit .env and set E2E_ADMIN_PASSWORD to the value from `dotnet user-secrets list`
```

`.env` is gitignored — it never reaches a commit. Playwright loads it automatically on every run.

**Option 2 — shell env vars.** Override or supplement on a per-invocation basis (env vars beat `.env`):

```bash
# PowerShell
$env:E2E_ADMIN_PASSWORD = "<the value from `dotnet user-secrets list`>"

# bash / zsh
export E2E_ADMIN_PASSWORD="<the value>"
```

Either way, **never paste the password into a tracked source file** — the repo's secret-scan ([verify.yml](../.github/workflows/verify.yml)) rejects PRs that contain the literal admin password.

Variables read by the suite:

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | Override to target a different web origin. |
| `E2E_ADMIN_EMAIL` | `admin@epl.local` | Bootstrap admin email. |
| `E2E_ADMIN_PASSWORD` | _(required)_ | Bootstrap admin password. |

---

## Run the suite

Start the dev servers in one terminal:

```bash
# from repo root
npm run dev
```

Run the tests in another:

```bash
cd e2e
npm test                 # headless, full suite
npm run test:headed      # see the browser drive itself
npm run test:ui          # Playwright UI mode (great for iterating on specs)
npm run report           # open the HTML report from the last run
```

Filter to a specific file or test name:

```bash
npx playwright test 03-brackets-t3
npx playwright test -g "BYE auto-advance"
```

---

## Layout

```
e2e/
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── helpers/
│   ├── auth.ts            # loginAsAdmin / logout helpers
│   ├── env.ts             # reads BASE_URL + admin creds from env vars (never hardcoded)
│   ├── tournament.ts      # createPublishedTournament + entry-row locators
│   └── unique.ts          # timestamped slug / name generators
└── tests/
    ├── 01-tournaments-t2.spec.ts        # happy path: create → register → confirm → seed
    ├── 02-tournaments-t2-edges.spec.ts  # duplicate mobile, Switch accounts logout
    └── 03-brackets-t3.spec.ts           # generate, publish, reseed, BYE auto-advance
```

Each spec uses `test.describe.configure({ mode: "serial" })` so the chain of operations (create → register → confirm → bracket) stays coherent within a file. Workers and parallelism are off globally in `playwright.config.ts` — admin login uses the same cookie jar per browser context, and the dev DB is a shared resource, so parallel runs would race on it.

---

## What the suite does NOT cover

- **Mobile bracket layout** — T-4 work, not built yet.
- **Per-game score entry** — T-4.
- **Match scheduling UI** — T-4.
- **Round-robin / group-knockout draws** — T-5.
- **Hard-deadline rejection** — would need to back-date `registrationDeadline` directly via the DB; skipped to keep the suite UI-only.

When those land, add specs alongside the existing ones — keep one file per iteration so the failure log tells you which slice broke.

---

## Cleaning up after a run

The suite intentionally doesn't tear down — leftover fixtures help when debugging a failure. To wipe them between runs, drop the dev DB or delete tournaments whose names start with `[E2E]`:

```sql
DELETE FROM Tournaments WHERE Name LIKE '[E2E]%';
-- cascades clean up TournamentCategories / Entries / Brackets / etc.
```

---

## CI

The suite isn't wired into the GitHub Actions verify workflow yet. When it is, expect:

1. A job that spins up the API + web (likely with `docker compose up`) and waits for `:3000` to respond.
2. `cd e2e && npm ci && npx playwright install --with-deps chromium && npm test`.
3. Upload the HTML report (`playwright-report/`) as an artifact for failures.

Until that lands, treat this suite as a local pre-merge check, run by hand before opening a PR.
