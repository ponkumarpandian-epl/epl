# Contributing

## Mandatory verify checks

Three checks gate every change. They run in **three places** with progressively heavier coverage:

| Stage | Where | What runs | How to skip |
|---|---|---|---|
| **`git commit`** | `.husky/pre-commit` | secret scan + web type-check | `git commit --no-verify` (discouraged) |
| **`git push`** | `.husky/pre-push` | + .NET build (Release) | `git push --no-verify` (discouraged) |
| **PR / push to main** | [.github/workflows/verify.yml](.github/workflows/verify.yml) | all 3 checks + TruffleHog + ESLint | **cannot be skipped** — required status check on `main` |

CI is the source of truth. The local hooks are a fast inner-loop convenience; if you bypass them, CI will still reject your PR.

## The three checks

### 1. Secret scan — `npm run verify:secrets`

Rejects any tracked file containing one of these known dev-only credentials:

| Pattern | Where it should live instead |
|---|---|
| `password@123` | `dotnet user-secrets` (see [SECRETS.md](SECRETS.md)) |
| `Admin_Bootstrap_Passw0rd` | `dotnet user-secrets` or `.env` |
| `Epl_Dev_Passw0rd` | `.env` (consumed by docker-compose) |
| `USWHGA4VF2\LOCALHOST` | `dotnet user-secrets` |

[SECRETS.md](SECRETS.md) is allow-listed because it legitimately documents these patterns in the rotation / recovery instructions.

CI additionally runs **TruffleHog** to catch any *unknown* secret shapes (AWS keys, JWT tokens, etc.) that snuck into your diff.

### 2. Web type-check — `npm run verify:web`

`tsc -p apps/web/tsconfig.json --noEmit`. No emitted output — pure type-checking. CI also runs ESLint via `npm run lint`.

### 3. .NET API build — `npm run verify:api`

`dotnet build apps/api/Epl.Api.slnx -c Release`. CI promotes warnings to errors via `/warnaserror`. Runs in Release mode locally to mirror CI behavior.

## One-line "run everything"

```bash
npm run verify
```

Runs all three in order, fails fast on the first failure.

## First-time setup on a fresh clone

```bash
npm install        # also runs `husky` via the `prepare` script — hooks are wired automatically
```

That single command:
- installs root dev dependencies (`husky`, `typescript`, `concurrently`)
- installs the web workspace (`apps/web`)
- creates the local hooks symlinks in `.git/hooks/`

Verify the hooks were registered:

```bash
ls -la .git/hooks | grep -E "pre-commit|pre-push"
# Should show pre-commit and pre-push files
```

## Enforcement on `main`

The `verify` workflow runs on every PR targeting `main` and on every direct push to `main`. To **enforce** it (block merges when red):

1. Go to **Settings → Branches → Branch protection rules**.
2. Add a rule for `main`.
3. Enable **"Require status checks to pass before merging"**.
4. Search for and select all three:
   - `verify / Secret scan`
   - `verify / Web type-check`
   - `verify / .NET API build`
5. Save.

Until that's configured, the workflow runs but doesn't block merges — please configure it on day one.

## Bypassing locally (in true emergencies only)

If the hooks are blocking you from committing a WIP branch:

```bash
git commit --no-verify   # skip pre-commit
git push   --no-verify   # skip pre-push
```

Both `--no-verify` paths still hit CI on the PR. You can't merge to `main` without going green.

## Database migrations on deploy

`dev-deploy-backend.yml` has a `migrate` job that runs between `build` and `deploy`. It:

1. **Always** produces an `efbundle` artifact (self-contained Linux executable that applies all pending migrations against any SQL Server connection string). Kept for 14 days for audit / manual rollback.
2. **Always** logs which migrations would apply (`dotnet ef migrations list`).
3. **Applies migrations to Azure SQL** only if a `SQL_MIGRATION_CONNECTION_STRING` repo secret is configured. Otherwise it logs a warning and skips — the app's startup-time `db.Database.MigrateAsync()` still runs, so the schema does eventually get updated; this gate just makes it explicit and fails the deploy if migrations fail.

`deploy` depends on `migrate`, so new app code is never published against an unmigrated database.

### To enable the auto-apply (recommended)

1. **Create a SQL login with the right scope** (one-time, on your dev SQL server):

   ```sql
   -- on master:
   CREATE LOGIN epl_migrator WITH PASSWORD = '<strong-password>';
   -- on epldb:
   CREATE USER epl_migrator FOR LOGIN epl_migrator;
   ALTER ROLE db_ddladmin    ADD MEMBER epl_migrator;
   ALTER ROLE db_datareader  ADD MEMBER epl_migrator;
   ALTER ROLE db_datawriter  ADD MEMBER epl_migrator;
   ```

   This account only has schema + data rights — it cannot drop the database or change server-level config.

2. **Open the firewall for GitHub Actions**: Azure Portal → SQL server → Networking → tick **"Allow Azure services and resources to access this server"**. (GitHub-hosted runners use Azure IPs.) Or set up a self-hosted runner inside your VNet later for tighter control.

3. **Add the GitHub Actions repo secret**:
   - Name: `SQL_MIGRATION_CONNECTION_STRING`
   - Value: `Server=tcp:<server>.database.windows.net,1433;Database=epldb;User Id=epl_migrator;Password=<strong-password>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`

The next push to `main` will apply migrations as a discrete CI step before the new app rolls out. Failure aborts the deploy.

### Rollback path

If a migration breaks something post-deploy:
1. Download the `migrations-bundle` artifact from the previous successful deploy.
2. Generate a down-script locally: `dotnet ef migrations script <CurrentMigration> <PreviousMigration>` and run it against the deployed DB.
3. Roll back the app via App Service deployment slot swap.

## When you change the verify rules

- The same secret patterns are duplicated in two places:
  - `scripts/verify-secrets.mjs` (local)
  - `.github/workflows/verify.yml` (CI)
- Keep them in sync.

## Reporting a false-positive in the secret scan

If the scanner flags something that legitimately needs to be in source (e.g. a publicly-known sample value in documentation), add the path to the `EXCLUDE_PATHS` array in `scripts/verify-secrets.mjs` **and** to the equivalent `-- ':!path/'` pathspec in `.github/workflows/verify.yml`. Open a PR describing why.
