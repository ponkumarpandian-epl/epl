# 11 — Domain cutover: Static Web App → App Service

> **Status:** runbook for the live cutover of `e-citypremierleague.in` from Azure Static Web Apps to the App Service `epl-sports-ui`.
> **API side:** already completed — `api.e-citypremierleague.in` is bound and Secured on `epl-sports-api`. This doc covers the UI cutover only.
> **Maintenance window:** ~15 min user-visible TLS warnings on the custom domain during cert issuance. Plan for a low-traffic time (midnight IST).

---

## Why this is staged

App Service Managed Certificate provisioning requires the hostname's DNS to **actually resolve to the App Service** at the moment of issuance (HTTP-style domain-control validation). The asuid TXT record is enough to **bind the hostname** to the App Service but **not enough to issue the cert**. Therefore the cutover sequence is:

1. Pre-bind hostnames (done — no user impact)
2. Flip DNS
3. Wait for propagation
4. Create certs (now succeeds because DNS resolves correctly)
5. Bind certs

The ~10 min between step 2 and step 5 is when users may see browser cert warnings on the custom domain. DNS TTL is intentionally at 5 min so most users still hit cached SWA during that window, and rollback is also fast.

---

## Pre-cutover state (already in place)

- **Registrar DNS records:**

  | Type | Host | Value | TTL |
  |---|---|---|---|
  | ALIAS | @ | `agreeable-field-0b058f800.7.azurestaticapps.net.` (SWA, current prod) | 5 min |
  | CNAME | www | `agreeable-field-0b058f800.7.azurestaticapps.net.` (SWA, current prod) | 5 min |
  | CNAME | api | `epl-sports-api-btdke0b5cadzbta6.southindia-01.azurewebsites.net` | Automatic |
  | TXT | @ | `_8bp1ayb66j82scj5604xgv93ay7ejg3` (SWA verification — leave until post-cutover) | Automatic |
  | TXT | asuid | `9E576CB1441C122A7585A9B1E8226AFAE41ABF499B8F40DDC6C502A8DB6466A9` | Automatic |
  | TXT | asuid.www | `9E576CB1441C122A7585A9B1E8226AFAE41ABF499B8F40DDC6C502A8DB6466A9` | Automatic |
  | TXT | asuid.api | `9E576CB1441C122A7585A9B1E8226AFAE41ABF499B8F40DDC6C502A8DB6466A9` | Automatic |

- **App Service `epl-sports-ui` Custom domains blade:**
  - `e-citypremierleague.in` → bound, status "No binding" (no cert yet) ✅
  - `www.e-citypremierleague.in` → bound, status "No binding" (no cert yet) ✅
  - `epl-sports-ui-efhwffd5h2ade8fk.southindia-01.azurewebsites.net` → default, Secured ✅

- **App Service inbound IP:** `40.78.194.99` (this is what apex/www must resolve to after flip).

---

## Step A — Flip DNS at the registrar

Edit **in-place** (do not delete + recreate — atomic edit is faster to propagate and safer to roll back).

| Type | Host | Old value | New value |
|---|---|---|---|
| ALIAS | @ | `agreeable-field-0b058f800.7.azurestaticapps.net.` | `epl-sports-ui-efhwffd5h2ade8fk.southindia-01.azurewebsites.net` |
| CNAME | www | `agreeable-field-0b058f800.7.azurestaticapps.net.` | `epl-sports-ui-efhwffd5h2ade8fk.southindia-01.azurewebsites.net` |

Click **SAVE ALL CHANGES**. Note the wall-clock time — this is T+0.

---

## Step B — Verify DNS propagation

Poll every minute until both hostnames return App Service IPs:

```powershell
nslookup e-citypremierleague.in 8.8.8.8
nslookup www.e-citypremierleague.in 8.8.8.8
```

**Expected result:** both resolve to `40.78.194.99`.

If still showing SWA IPs (`132.220.38.112` / `192.64.119.86`) after 10 min, cross-check with `1.1.1.1` and `9.9.9.9` to rule out one resolver lagging.

**Do not proceed to Step C until both `8.8.8.8` lookups return `40.78.194.99`.** Creating certs against still-SWA DNS will fail with the same `BadRequest` "A record must point to 40.78.194.99" error we hit earlier.

---

## Step C — Create + bind certs, force HTTPS

Paste-and-go script (run in Azure Cloud Shell or local PowerShell with `az` logged in):

```powershell
$rg = "rg-epl"
$app = "epl-sports-ui"
$hosts = @("www.e-citypremierleague.in", "e-citypremierleague.in")

foreach ($h in $hosts) {
  Write-Host "Creating managed cert for $h..." -ForegroundColor Cyan
  az webapp config ssl create --resource-group $rg --name $app --hostname $h

  Write-Host "Binding cert for $h..." -ForegroundColor Cyan
  $thumb = az webapp config ssl list --resource-group $rg `
    --query "[?subjectName=='$h'].thumbprint | [0]" -o tsv
  az webapp config ssl bind --resource-group $rg --name $app `
    --certificate-thumbprint $thumb --ssl-type SNI
}

Write-Host "Enabling HTTPS-only..." -ForegroundColor Cyan
az webapp update --resource-group $rg --name $app --set httpsOnly=true

Write-Host "Smoke test..." -ForegroundColor Green
curl -I https://www.e-citypremierleague.in
curl -I https://e-citypremierleague.in
```

**Expected runtime:** ~5–7 min (1–3 min per cert).

**Notes:**
- If `az webapp config ssl list` returns empty against `rg-epl`, the certs may live in the App Service Plan's RG. Find with `az resource list --resource-type Microsoft.Web/certificates -o table`.
- `az webapp config ssl create` is idempotent — if a cert resource already exists for that hostname (e.g. from an earlier Portal attempt), it returns the existing one rather than creating a duplicate.

**Done when:** both `curl -I` calls return `HTTP/2 200` (or `301`/`307` depending on app routing) with a valid TLS handshake. In the Portal, both `e-citypremierleague.in` and `www.e-citypremierleague.in` rows under Custom domains show **Secured** with binding type SNI SSL.

---

## Rollback

**Trigger:** any of these conditions during or after cutover:

- DNS resolves correctly but `https://e-citypremierleague.in` returns the App Service default page (means deploy slot routing is wrong on `epl-sports-ui`).
- Persistent 5xx errors from `epl-sports-ui` after DNS flip.
- Cert creation fails with errors other than the well-known "A record must point to" (which is fixed by waiting for DNS).
- Major user-reported breakage (login flow, registration submission) that wasn't reproducible against the App Service before cutover.

**Procedure (5 min to revert):**

1. At the registrar, edit-in-place:
   - `ALIAS @` value → `agreeable-field-0b058f800.7.azurestaticapps.net.`
   - `CNAME www` value → `agreeable-field-0b058f800.7.azurestaticapps.net.`
   - **SAVE ALL CHANGES.**
2. Verify users are back on SWA:
   ```powershell
   nslookup e-citypremierleague.in 8.8.8.8
   nslookup www.e-citypremierleague.in 8.8.8.8
   ```
   Should return SWA IPs again (`132.220.38.112` / `192.64.119.86`).
3. **Do not delete** any of the work from Step A–C on the App Service side:
   - Hostname bindings stay (they're harmless without traffic).
   - Cert bindings stay (they renew via asuid TXT, no impact while no traffic flows).
   - HTTPS-only stays on (no effect when nothing routes here).
   - All this means a retry of Step A can be done at any point with no re-prep work.
4. File a bug for whatever caused the rollback. Don't retry Step A until the root cause is understood and fixed in `apps/web` (or wherever the regression lives).

**What rollback does NOT recover:**
- Users who hit the broken state during the window and bookmarked a bad URL — but the URL itself is unchanged, so re-visiting works.
- Cookies set during the broken window are domain-scoped to `e-citypremierleague.in` and survive — no session loss.

---

## Post-cutover cleanup (24h after stable)

Wait 24h of stable operation. Then:

1. **Delete the SWA validation TXT** at the registrar — host `@`, value `_8bp1ayb66j82scj5604xgv93ay7ejg3`. SWA no longer uses it.
2. **In the Static Web App resource** (`agreeable-field-0b058f800`), remove the custom-domain bindings for `e-citypremierleague.in` and `www.e-citypremierleague.in`. Otherwise the SWA may keep auto-renewing its own (now unused) managed cert.
3. **Raise registrar TTL** on the apex ALIAS and `www` CNAME from `5 min` → `Automatic` (typically 30–60 min). Reduces DNS query load. Skip if a follow-up cutover is planned within a week.
4. After 48h of confirmed stability, **delete the Static Web App resource itself** to stop any residual billing/management overhead. The DNS flip is the actual cutover — deleting the SWA is just resource hygiene.

---

## Records that must stay forever

Do **not** clean these up as part of any cleanup pass — they are required for App Service Managed Certificate auto-renewal every ~6 months:

| Type | Host | Value | Purpose |
|---|---|---|---|
| ALIAS | @ | `epl-sports-ui-...azurewebsites.net` | Apex → UI App Service (live traffic) |
| CNAME | www | `epl-sports-ui-...azurewebsites.net` | www → UI App Service (live traffic) |
| CNAME | api | `epl-sports-api-...azurewebsites.net` | api → API App Service (live traffic) |
| TXT | asuid | `9E576CB1441C122A7585A9B1E8226AFAE41ABF499B8F40DDC6C502A8DB6466A9` | Apex cert renewal |
| TXT | asuid.www | `9E576CB1441C122A7585A9B1E8226AFAE41ABF499B8F40DDC6C502A8DB6466A9` | www cert renewal |
| TXT | asuid.api | `9E576CB1441C122A7585A9B1E8226AFAE41ABF499B8F40DDC6C502A8DB6466A9` | api cert renewal |

If any asuid TXT is deleted, the corresponding cert will fail to auto-renew ~6 months later, causing a hard TLS outage on that hostname. Common foot-gun — call it out in any future "DNS cleanup" PRs.
