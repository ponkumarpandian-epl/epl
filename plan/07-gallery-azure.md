# 07 — Gallery: Azure Blob Storage with auto-discovery

> **Status:** plan only — no code changes until approved.
> **Goal:** images uploaded to Azure show up on the home-page gallery automatically, no per-image config / code edits.
> **Domain:** custom subdomain `gallery.e-citypremierleague.in` serves the images.
> **Today:** the gallery reads URLs from an array in `appsettings.Development.json` — that array goes away.

---

## Decisions (lock these before iteration starts)

| # | Decision | Choice |
|---|---|---|
| D1 | Storage layout | **Option A — one container per season** (`season-1`, `season-2`, …) with sport sub-folders inside (`cricket/`, `badminton/`, `volleyball/`, `highlights/`) |
| D2 | TLS / custom domain front-end | **Cloudflare** (free) — proxies `gallery.e-citypremierleague.in` → `<account>.blob.core.windows.net`. Cheapest path; full TLS termination + edge cache included. |
| D3 | Public read access on individual blobs | **Enabled** at container level (access level: `Blob`). Browsers can `GET` an image URL directly; **no public list** access. |
| D4 | Backend auth to list blobs | **Production:** Managed Identity → `Storage Blob Data Reader` role on the storage account. **Dev:** account key via `dotnet user-secrets` (never committed). |
| D5 | Alt-text source | **Default:** prettified filename (`captain-six-finals.jpg` → "Captain six finals"). **Override:** blob metadata `x-ms-meta-alt` if present. |
| D6 | Listing cache | **5 minutes** in-memory (`IMemoryCache`). Acceptable — uploads propagate within that window. Event-Grid-driven invalidation is a follow-up. |
| D7 | Frontend contract | **Unchanged.** Same `GET /api/gallery` returning `GalleryResponse { items, total, generatedAt }`. The bento grid / lightbox / category tinting all continue to work. |

If any of D1–D7 is wrong, change it here before [05-iterations.md](./05-iterations.md) gets a new iteration entry.

---

## 1. DNS / TLS — `gallery.e-citypremierleague.in`

```
Browser ──https://gallery.e-citypremierleague.in/...
                │
                ▼
        Cloudflare (free tier, proxy mode, managed TLS)
                │
                ▼ HTTPS to origin
         <account>.blob.core.windows.net
                │
                ▼
            Public blob (anonymous read)
```

### Set-up checklist
- [ ] Create storage account (e.g. `eplmedia`, **Standard, LRS, Cool tier** for cost; **Hot** if traffic warrants it).
- [ ] Storage account **→ Configuration → "Allow Blob anonymous access"** = **Enabled**. (Subscription-level toggle that defaults to off on new accounts since 2023.)
- [ ] In Cloudflare DNS for `e-citypremierleague.in`: `CNAME gallery → eplmedia.blob.core.windows.net`, **Proxy = ON** (orange cloud).
- [ ] Cloudflare → SSL/TLS → **Full (strict)** (Azure presents a valid cert on its `*.blob.core.windows.net` endpoint).
- [ ] Verify: `curl -I https://gallery.e-citypremierleague.in/` returns 200 from Azure (with cf-ray header).

### Notes
- Cloudflare also caches images at the edge — egress from Azure stays minimal.
- No need to upload our own cert.
- Azure's "Custom Domain" blade isn't used — only the CNAME on the DNS side matters for Cloudflare-fronted traffic.

---

## 2. Storage layout (Option A)

```
eplmedia (storage account)
├─ season-1 (container, access: Blob)
│   ├─ cricket/
│   │   ├─ opening-day-toss.jpg
│   │   ├─ captain-six-finals.jpg
│   │   └─ ...
│   ├─ badminton/
│   ├─ volleyball/
│   └─ highlights/                 (sponsor logos, ceremonies, group shots)
│
└─ season-2 (container)
    ├─ cricket/
    ├─ badminton/
    └─ ...
```

### URL examples (what the browser fetches)
```
https://gallery.e-citypremierleague.in/season-2/cricket/captain-six-finals.jpg
https://gallery.e-citypremierleague.in/season-1/badminton/finals-rally-01.jpg
https://gallery.e-citypremierleague.in/season-2/highlights/opening-fireworks.jpg
```

### Container naming rules (Azure)
- 3–63 chars, lowercase letters / digits / single hyphens, no consecutive hyphens.
- `season-1`, `season-2`, …, `season-10` all valid.
- One container created per season as needed — no need to create all upfront.

### Per-season RBAC
- Grant `Storage Blob Data Contributor` on a specific container to the season coordinator (so cricket / badminton / volleyball coordinators can only upload to the active season).

### Recommended upload conventions (enforce by docs, not code)
- Filenames lowercase + dashes, descriptive: `captain-six-finals.jpg`, not `IMG_0042.jpg`.
- Max 2 MB per file, ≤ 2400 px on the long edge (Next/Image will optimise smaller variants automatically).
- Format: JPEG for photos, WebP if you re-encode, PNG only for logos with transparency.

---

## 3. Backend refactor — `GalleryService`

### Today
[`apps/api/src/Epl.Application/Gallery/Services/GalleryService.cs`](../apps/api/src/Epl.Application/Gallery/Services/GalleryService.cs) reads the image list from `IConfiguration` (`Gallery:Images`).

### After
Same interface (`IGalleryService.ListAsync`), same DTO (`GalleryResponse`), but the implementation reads from Azure.

```csharp
public class GalleryService(
    BlobServiceClient blobs,           // injected, configured in Infrastructure
    IMemoryCache       cache,
    IOptions<GalleryOptions> opts,
    ILogger<GalleryService> log) : IGalleryService
{
    public async Task<GalleryResponse> ListAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue<GalleryResponse>("gallery", out var cached)) return cached!;

        var items = new List<GalleryImage>();
        foreach (var containerName in opts.Value.Containers)   // e.g. ["season-2", "season-1"]
        {
            var container = blobs.GetBlobContainerClient(containerName);
            await foreach (var blob in container.GetBlobsAsync(BlobTraits.Metadata, cancellationToken: ct))
            {
                if (!LooksLikeImage(blob.Name)) continue;
                items.Add(ToDto(containerName, blob, opts.Value.PublicBaseUrl));
            }
        }

        var response = new GalleryResponse(
            Items:       items.OrderByDescending(...).ToList(),
            Total:       items.Count,
            GeneratedAt: DateTimeOffset.UtcNow);

        cache.Set("gallery", response, TimeSpan.FromMinutes(opts.Value.CacheMinutes));
        log.LogInformation("Gallery listing refreshed: {Count} images across {N} containers", items.Count, opts.Value.Containers.Length);

        return response;
    }
}
```

### Mapping a blob to a `GalleryImage`

```
Container:   season-2
Blob name:   cricket/captain-six-finals.jpg
Metadata:    { "alt": "Captain Aman's six in the final over" } (optional)

→ Url:       https://gallery.e-citypremierleague.in/season-2/cricket/captain-six-finals.jpg
→ Category:  "Cricket"      (path[0], capitalised)
→ Season:    "Season 2"     (container, parsed)
→ Alt:       blob.Metadata["alt"]  ??  Prettify("captain-six-finals")
            = "Captain six finals"     (when no metadata override)
```

Ordering: newest first (by `BlobItem.Properties.LastModified`), with optional per-blob `x-ms-meta-order` numeric override.

### NuGet additions (`Epl.Infrastructure.csproj`)

| Package | Purpose |
|---|---|
| `Azure.Storage.Blobs` | Blob SDK |
| `Azure.Identity` | `DefaultAzureCredential` for managed identity in prod |
| `Microsoft.Extensions.Caching.Memory` | Already transitive but ensure explicit |

### DI wiring (`Epl.Infrastructure.DependencyInjection`)

```csharp
services.Configure<GalleryOptions>(config.GetSection("Gallery"));
services.AddSingleton<BlobServiceClient>(sp =>
{
    var opts = config.GetSection("Gallery").Get<GalleryOptions>()!;
    return string.IsNullOrEmpty(opts.ConnectionString)
        ? new BlobServiceClient(new Uri(opts.AccountUri!), new DefaultAzureCredential())   // prod path
        : new BlobServiceClient(opts.ConnectionString);                                     // dev path
});
services.AddMemoryCache();
```

### Configuration shape

`appsettings.Development.json` (user-secrets in dev — never committed):
```json
{
  "Gallery": {
    "PublicBaseUrl":    "https://gallery.e-citypremierleague.in",
    "Containers":       [ "season-2", "season-1" ],
    "CacheMinutes":     5,
    "AccountUri":       "https://eplmedia.blob.core.windows.net",
    "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=eplmedia;AccountKey=…"
  }
}
```

`appsettings.json` (committed defaults, no secret):
```json
{
  "Gallery": {
    "PublicBaseUrl": "https://gallery.e-citypremierleague.in",
    "Containers":    [ "season-2", "season-1" ],
    "CacheMinutes":  5,
    "AccountUri":    "https://eplmedia.blob.core.windows.net"
  }
}
```

In **production**, only `PublicBaseUrl`, `Containers`, and `AccountUri` are set (no key). `DefaultAzureCredential` picks up the App Service / Container App managed identity automatically.

### Auth strategy summary

| Environment | How `BlobServiceClient` authenticates | Where the secret lives |
|---|---|---|
| Local dev | Connection string from `dotnet user-secrets` | `%APPDATA%\Microsoft\UserSecrets\epl-api-dev\secrets.json` (not in repo) |
| CI tests | Azurite (local emulator) connection string | env var, GitHub Actions secret |
| Production (Azure) | Managed Identity (`DefaultAzureCredential`) | none — RBAC: identity needs `Storage Blob Data Reader` on the account |

### Removing the old config-driven list

- The `Gallery:Images` array in `appsettings.Development.json` is **deleted** when this lands.
- Any local files in `apps/web/public/card-*.jpg` referenced today can stay as static assets (sport cards still use them) — only the Gallery section stops reading them.

---

## 4. Frontend — what changes

**Nothing.** Same Server Component fetches `/api/gallery` → same `GalleryResponse` shape → same bento + lightbox UI. The only visible difference is that the URLs returned now point at `gallery.e-citypremierleague.in` instead of local `/card-*.jpg`.

`apps/web/next.config.ts` already whitelists `*.blob.core.windows.net`, `*.azureedge.net`, `*.azurefd.net`. **Add** `gallery.e-citypremierleague.in` to `images.remotePatterns` as part of the iteration:

```ts
{ protocol: "https", hostname: "gallery.e-citypremierleague.in", pathname: "/**" },
```

(Cloudflare-fronted custom domain isn't covered by the wildcard above.)

---

## 5. Iteration plan (drop into [05-iterations.md](./05-iterations.md))

> **Iteration 9 — Gallery on Azure Blob Storage (~3 hr)**

| Step | Task | Owner | Time |
|---|---|---|---|
| 1 | Provision storage account `eplmedia`, enable anonymous blob access | Ops | 15 m |
| 2 | Cloudflare DNS: CNAME `gallery → eplmedia.blob.core.windows.net`, proxy ON, SSL = Full (strict). Verify `curl -I https://gallery.e-citypremierleague.in/` returns 200 | Ops | 15 m |
| 3 | Create container `season-2`, access level = `Blob`. Upload a handful of test images under `cricket/`, `badminton/`, `volleyball/`, `highlights/` | Ops | 15 m |
| 4 | Add `Azure.Storage.Blobs` + `Azure.Identity` packages to `Epl.Infrastructure.csproj` | Dev | 5 m |
| 5 | Implement new `GalleryService` per section 3 above (keep interface + DTO contract) | Dev | 1 h |
| 6 | DI wiring + `GalleryOptions` class + cache | Dev | 20 m |
| 7 | Add `gallery.e-citypremierleague.in` to `next.config.ts → images.remotePatterns` | Dev | 5 m |
| 8 | Delete `Gallery:Images` array from `appsettings.Development.json` | Dev | 2 m |
| 9 | Local end-to-end test: dev runs against real Azure storage via user-secrets, gallery shows the uploaded images | Dev | 20 m |
| 10 | Deploy → assign Managed Identity → grant `Storage Blob Data Reader` → verify in prod | Dev / Ops | 30 m |

### Acceptance criteria

1. Uploading a new file to `season-2/cricket/` in Azure Storage Explorer (or via `az storage blob upload`) makes it appear on the home-page gallery within **5 minutes** with no code or config change.
2. `GET /api/gallery` returns the new image in the `items[]` array with `category: "Cricket"`, sensible `alt`, and an absolute `url` under `gallery.e-citypremierleague.in`.
3. Deleting a blob in Azure removes it from the gallery within the next cache window.
4. The frontend renders Azure-hosted images through `next/image` (verify `width`/`height` query params in dev-tools Network panel).
5. No image URLs, no storage keys, and no connection strings are hardcoded in source files committed to git.
6. Production runs without any storage account key in App Service config — only `Gallery:AccountUri` + RBAC-granted Managed Identity.
7. Lighthouse a11y ≥ 95 on the home page (unchanged from current).

---

## 6. Open follow-ups (not blocking iteration 9)

- **Event-Grid-driven cache invalidation** — instead of TTL, Storage sends `BlobCreated` / `BlobDeleted` events to an Azure Function that POSTs to a (signed) `/api/gallery/invalidate` endpoint. Brings refresh latency from ~5 min to ~5 s.
- **Admin upload UI** — an `Admin`-only page under `/teams/admin/gallery` that POSTs multipart to `/api/gallery/upload`, which uploads to the active season's container via the same managed identity. Lets coordinators upload from a phone without Storage Explorer.
- **Image variants** — generate WebP + thumbnail versions on upload (Azure Function with `Magick.NET`) and let the API return `srcSet`. Cuts bandwidth ~50% for slow connections.
- **Sport / season filter UI** — the gallery API already tags each image with `Category`. Add a chip filter row above the bento grid so users can narrow to one sport.

---

## 7. Cost estimate (rough)

| Item | Cost / month |
|---|---|
| Storage account (Standard, LRS, 100 GB, Cool tier) | ~$1.20 |
| Egress from Azure (most served from Cloudflare cache) | ~$0–2 |
| Cloudflare (Free plan) | $0 |
| Managed Identity / RBAC | $0 |
| **Total** | **< $5 / month** |

If we ever migrate to Azure Front Door instead of Cloudflare: add ~$35/mo base + traffic. Not recommended unless we need WAF or geo-routing.

---

## 8. Caveats / things to know before signing off

1. **Anonymous blob access is a subscription-level switch** — even if you set a container's access level to `Blob`, it stays private until the account-level toggle is `Enabled`. Default has been `Disabled` on new accounts since late 2023.
2. **Listing requires auth** — anonymous users can't enumerate the container. That's good (privacy + abuse) and is why our backend does the listing then returns the list to the browser.
3. **CORS isn't needed** for `<img>` / `next/image` rendering. Only matters if we ever fetch the binary via JS (we don't).
4. **Container name = first path segment of URL.** `season-1` becomes `https://gallery.e-citypremierleague.in/season-1/...`. Pick a naming convention before you start uploading because renaming containers later is painful.
5. **Blob metadata keys are case-insensitive and ASCII-only.** Use `alt`, `order`, `caption` — short, lowercase.
6. **Cloudflare caches images by default for ~2 h** at the edge. For testing fresh uploads, purge in CF dashboard or add `?v=…` cache-buster.
7. **Egress beyond CF's free tier** — only relevant at very high traffic. Cloudflare Pro ($25/mo) increases caching aggressively.
