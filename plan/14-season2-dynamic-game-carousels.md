# 14 — Season 2 dynamic game carousels

> **Status:** implemented.
> **Date:** 2026-07-23
> **Goal:** keep the existing hardcoded Season 2 bento gallery unchanged, then add a separate auto-playing carousel subsection whose Cricket, Badminton, and Volleyball images are discovered from Azure Blob Storage.

---

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Existing gallery | Keep the current hardcoded gallery images, layout, and lightbox exactly as-is. |
| D2 | Dynamic gallery placement | Add a new **Game Day Galleries** subsection below the existing bento gallery. |
| D3 | Azure layout | Storage account `steplmediacontent`, container `season2`, with root prefixes `cricket/`, `badminton/`, and `volleyball/`. |
| D4 | Presentation | Three separate carousels: Cricket, Badminton, and Volleyball. Each shows one image at a time. |
| D5 | Autoplay | Advance every 5 seconds only while the carousel is visible. Pause on hover, focus, hidden browser tab, lightbox open, and reduced-motion preference. |
| D6 | Listing cache | Cache the Azure-generated image manifest in the API for **15 minutes**. A normal page load must not list Azure blobs when this cache is warm. |
| D7 | Existing API | Preserve `GET /api/gallery` and its configuration-driven behavior. Add a separate endpoint for the new game carousels. |
| D8 | Database | No entities, tables, or migrations. Azure Blob Storage remains the source of truth. |

---

## 1. Resulting homepage structure

```text
Photo Gallery
├─ Existing hardcoded bento gallery + lightbox (unchanged)
└─ Game Day Galleries (new)
   ├─ Cricket carousel
   ├─ Badminton carousel
   └─ Volleyball carousel
```

The new subsection must not replace, filter, or modify the existing hardcoded gallery in
[`results-gallery.tsx`](../apps/web/src/components/home/results-gallery.tsx).

---

## 2. Azure storage layout

```text
steplmediacontent
└─ season2                       (container)
   ├─ cricket/
   │  ├─ opening-match.jpg
   │  └─ finals-celebration.jpg
   ├─ badminton/
   │  └─ ...
   └─ volleyball/
      └─ ...
```

Browser URL example:

```text
https://steplmediacontent.blob.core.windows.net/season2/cricket/opening-match.jpg
```

Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, and `.avif`. Folder placeholders,
videos, documents, thumbnails generated elsewhere, and unsupported extensions are ignored.

Recommended upload convention:

- Use unique, descriptive lowercase filenames instead of overwriting an existing blob.
- Keep photographs below 2 MB and approximately 2400 px on the long edge.
- Optionally set blob metadata `alt` for an editorial caption.
- When `alt` metadata is absent, generate readable text from the filename.

---

## 3. Does every page load read Azure Storage?

**No, not with the cache in this plan.**

The request flow will be:

```text
Homepage render
    │
    ▼
GET /api/gallery/season2-games
    │
    ├─ Cached manifest exists ──► return cached JSON; no Azure list request
    │
    └─ Cache expired/missing ───► list 3 Azure prefixes, cache for 15 min, return JSON
```

The frontend may call the API for each server-rendered page request, but that is an internal
App Service request. Only the first request after the 15-minute cache expires lists Azure.
With the current single API instance, the theoretical maximum under continuous traffic is:

```text
4 refreshes/hour × 24 hours × 30 days × 3 prefixes = 8,640 list operations/month
```

That assumes each prefix fits in one Azure result page. Azure returns paged listings, so a folder
with thousands of blobs can require additional transactions. Actual usage will normally be lower
because the cache refreshes only when a visitor arrives after expiry.

### Cost impact

There are two separate cost types:

1. **Blob listing:** Azure bills `List Blobs` under the List/Create Container transaction category.
   A 15-minute cache keeps this to a small number of operations rather than one set per visitor.
2. **Image delivery:** fetching an image can incur a read transaction, bandwidth/egress, and—on
   Cool/Cold tiers—data retrieval charges. This is more likely to matter than the listing cost.

Cost controls in this plan:

- Cache the manifest for 15 minutes.
- Use one process-level cache entry: `gallery:season2:games`.
- Mount only the current, previous, and next slide.
- Start autoplay only when the carousel enters the viewport.
- Use `next/image` so optimized renditions are cached instead of repeatedly downloading the full
  source image.
- Set long-lived `Cache-Control` metadata on blobs that use unique filenames.

Uploading or deleting a photo becomes visible within 15 minutes. If a faster update is required
later, add an admin-only cache invalidation endpoint or Azure Event Grid; do not reduce the TTL for
every visitor by default.

Official Azure references:

- [List Blobs billing and authorization](https://learn.microsoft.com/en-us/rest/api/storageservices/list-blobs)
- [Azure Blob Storage pricing](https://azure.microsoft.com/en-in/pricing/details/storage/blobs/)
- [Plan and manage Blob Storage costs](https://learn.microsoft.com/en-us/azure/storage/common/storage-plan-manage-costs)
- [Map REST operations to pricing categories](https://learn.microsoft.com/en-us/azure/storage/blobs/map-rest-apis-transaction-categories)

---

## 4. Backend design

### 4.1 New endpoint

Add:

```http
GET /api/gallery/season2-games
```

Keep the existing `GET /api/gallery` endpoint unchanged.

The new endpoint returns the existing flat `GalleryResponse` shape so the frontend can reuse
`GalleryImageDto`:

```json
{
  "items": [
    {
      "url": "https://steplmediacontent.blob.core.windows.net/season2/cricket/opening-match.jpg",
      "alt": "Opening match",
      "category": "Cricket"
    }
  ],
  "total": 1,
  "generatedAt": "2026-07-23T10:00:00Z"
}
```

### 4.2 Application abstraction

Add an Azure-agnostic interface in `Epl.Application/Gallery`:

```csharp
public interface IGameGallerySource
{
    Task<GalleryResponse> ListSeason2GamesAsync(CancellationToken ct = default);
}
```

The Application layer must not reference Azure SDK packages directly.

### 4.3 Infrastructure implementation

Add `AzureBlobGameGallerySource` under `Epl.Infrastructure/Storage`:

- Read the `season2` container.
- List the `cricket/`, `badminton/`, and `volleyball/` prefixes.
- Request blob metadata in the listing operation to avoid a metadata request per image.
- Filter supported extensions.
- Map the prefix to `Category`.
- Use `metadata["alt"]` or a prettified filename for `Alt`.
- Sort within each sport by `LastModified` descending, then blob name for stability.
- Log refresh duration, returned count per sport, and failures without logging credentials.
- Cache the complete response for 15 minutes using the existing `ICacheStore` infrastructure.
- Protect refreshes from a cache stampede so concurrent requests trigger only one Azure listing.

### 4.4 Packages and authentication

Add to `Epl.Infrastructure.csproj`:

- `Azure.Storage.Blobs`
- `Azure.Identity`

Recommended authentication:

| Environment | Authentication |
|---|---|
| Production | App Service managed identity with `Storage Blob Data Reader` on `steplmediacontent` |
| Local development | Storage connection string stored in .NET user-secrets |

Public browser access to individual images does not necessarily allow container listing. The API
identity therefore needs explicit list permission. Do not commit storage keys or SAS tokens.

### 4.5 Configuration

Committed defaults:

```json
{
  "GameGallery": {
    "AccountUri": "https://steplmediacontent.blob.core.windows.net",
    "PublicBaseUrl": "https://steplmediacontent.blob.core.windows.net",
    "Container": "season2",
    "Prefixes": [ "cricket/", "badminton/", "volleyball/" ],
    "CacheMinutes": 15
  }
}
```

Local-only secret:

```powershell
dotnet user-secrets set "GameGallery:ConnectionString" "<storage-connection-string>" --project apps/api/src/Epl.Api
```

---

## 5. Frontend design

### 5.1 Preserve the existing gallery

Do not change the `seasonTwoGallery` hardcoded array or the existing `GalleryGrid` rendering in
[`results-gallery.tsx`](../apps/web/src/components/home/results-gallery.tsx).

Convert `ResultsGallery` to an async Server Component that:

1. Renders the existing hardcoded gallery immediately.
2. Calls `GET /api/gallery/season2-games` once.
3. Groups the returned flat items by `category`.
4. Renders the new subsection only when at least one sport has images.
5. Handles API/storage failure by keeping the hardcoded gallery visible and omitting only the new
   dynamic subsection.

### 5.2 New carousel component

Add a client component:

```text
components/home/game-gallery-carousel.tsx
```

Each carousel receives `sport` and `items` and provides:

- One large image at a time.
- Five-second cross-fade/slide transition.
- Previous and next buttons.
- `current / total` counter rather than dozens of dots.
- Touch swipe on mobile.
- Click/tap to open a lightbox.
- A sport-specific accent: Cricket gold, Badminton cyan, Volleyball crimson.
- No controls or timer when a folder contains only one image.

### 5.3 Autoplay behavior

- Start only when at least 50% of the carousel is visible using `IntersectionObserver`.
- Pause when the carousel is hovered or contains keyboard focus.
- Pause when `document.hidden` is true.
- Pause while its lightbox is open.
- Reset the five-second timer after manual navigation.
- Disable autoplay and animated transitions under `prefers-reduced-motion: reduce`.
- Do not use an assertive live region for automatic changes; announce only user-triggered changes.

### 5.4 Image loading

- Render only the previous, current, and next slide to limit memory and network usage.
- Give no dynamic carousel image `priority`; the subsection is below the fold.
- Use responsive `sizes` and `object-fit: contain` where mixed image ratios would otherwise crop
  important content.
- Keep `*.blob.core.windows.net` in `next.config.ts` remote patterns; it already covers these URLs.

---

## 6. File impact

Expected changes:

```text
apps/api/src/Epl.Application/Gallery/
  Services/IGalleryService.cs                  extend with season-game listing method, or add focused interface
  Services/IGameGallerySource.cs               new Azure-agnostic contract

apps/api/src/Epl.Infrastructure/
  Storage/AzureBlobGameGallerySource.cs        new
  Storage/GameGalleryOptions.cs                new
  DependencyInjection.cs                       Blob client + source registration
  Epl.Infrastructure.csproj                    Azure SDK packages

apps/api/src/Epl.Api/
  Controllers/GalleryController.cs             new route
  appsettings.json                              non-secret GameGallery defaults
  appsettings.Development.json                  no committed secret

apps/web/src/components/home/
  results-gallery.tsx                           retain hardcoded gallery; append dynamic subsection
  game-gallery-carousel.tsx                    new client component
  gallery.css                                   carousel and responsive styles
```

No existing hardcoded image URL is removed by this work.

---

## 7. Implementation phases

### Phase 1 — storage discovery

1. Add Azure SDK packages and `GameGalleryOptions`.
2. Configure managed identity/client registration.
3. Implement prefix listing, filtering, metadata alt text, ordering, and 15-minute cache.
4. Add `GET /api/gallery/season2-games`.
5. Verify each sport returns its uploaded files and that `/api/gallery` remains unchanged.

### Phase 2 — carousel UI

1. Fetch the dynamic endpoint from `ResultsGallery`.
2. Keep the existing hardcoded bento grid first.
3. Add the Game Day Galleries subsection and three sport carousels.
4. Add autoplay, pause rules, controls, swipe, and lightbox.
5. Add empty/error states that do not hide the hardcoded gallery.

### Phase 3 — performance and accessibility

1. Mount only adjacent slides and confirm lazy loading.
2. Validate keyboard navigation, focus visibility, touch targets, and reduced motion.
3. Verify image ratios at 375, 768, 1024, and 1440 px.
4. Confirm one warm-cache homepage request produces zero Blob `List` operations.

---

## 8. Acceptance criteria

1. The existing hardcoded gallery looks and behaves exactly as it does before this feature.
2. A separate Game Day Galleries subsection contains Cricket, Badminton, and Volleyball sections.
3. Uploading a supported image under `season2/cricket/`, `badminton/`, or `volleyball/` makes it
   appear within 15 minutes without a code deployment.
4. Deleting a blob removes it after the cache window.
5. Normal page requests within the cache window do not issue Azure list operations.
6. Only visible/adjacent carousel images load; the page does not download every game image at once.
7. Each carousel advances one image every five seconds while visible and pauses under all specified
   user and accessibility conditions.
8. One empty or unavailable sport folder does not affect the other carousels or hardcoded gallery.
9. No credentials are committed, and production uses managed identity.
10. `npm run verify`, frontend ESLint, and the production web build pass.

---

## 9. Out of scope

- Removing or replacing the hardcoded bento gallery.
- Admin upload UI.
- Video playback.
- Database-backed gallery records.
- Event Grid cache invalidation in the first release.
- Cross-season gallery browsing.
