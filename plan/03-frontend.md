# 03 — Frontend (Next.js 16, `apps/web`)

> Keep the existing Next 16 + React 19 + Tailwind v4 workspace. Rewrite the pages, components and `globals.css` to match [02-design-system.md](./02-design-system.md). All cross-cutting copy comes from the reference [index.html](file:///C:/src/Projects/epl-coming-soon/index.html).

## Route map (after the rebuild)

| Path | Auth | Server / Client | Purpose |
|---|---|---|---|
| `/` | public | Server | Home — exact visual clone of `epl-coming-soon/index.html` |
| `/login` | public (redirect to `/` if already signed in) | Server shell + Client form | Mobile-or-email + password sign-in |
| `/register` | public (redirect to `/` if already signed in) | Server shell + Client form | User sign-up (defaults to Player role) |
| `/teams/register` | `Authorize` (any role) | Server shell + Client form | Team registration with map picker |
| `/teams/admin` | `Authorize(Roles=Admin)` policy | Server (RSC) | Paginated list of all registered teams (search, sport filter) |
| `/api/auth/[...slug]` | n/a | Edge Route Handler | Thin proxy to .NET `/identity/*` so the Identity cookie sits on the same origin |

Everything else — `/tournaments`, `/bracket`, `/umpire`, `/api/(scoring|matches|teams etc.)` — is removed by [06-cleanup.md](./06-cleanup.md).

## Component inventory

```
components/
├─ shell/
│  ├─ site-header.tsx        sticky navy header w/ logo, brand text, status dot, Register CTA
│  ├─ site-footer.tsx        copyright + center link + contact
│  └─ auth-context.tsx       'use client' — reads cookie via /api/auth/me
├─ home/
│  ├─ topbar.tsx             floating glass pill ("EPL · Season 2 (2026) · Bengaluru")
│  ├─ hero-banner.tsx        full-bleed hero w/ title + ticker (Server Component, no JS for animations)
│  ├─ sport-card.tsx         cricket / badminton / volleyball card — clicking → /teams/register?sport=…
│  ├─ champion-banner.tsx    gold trophy banner
│  ├─ sponsors-cta.tsx       "Become a Sponsor" mailto CTA
│  └─ floating-balls.tsx     decorative SVG balls (CSS-only animation)
├─ forms/
│  ├─ field.tsx              <label> + <input> + error wiring (consumes .field tokens)
│  ├─ password-field.tsx     field + show/hide toggle (eye icon from lucide-react)
│  ├─ mobile-or-email-field.tsx auto-detects format → routes to `userName` (mobile) or `email`
│  ├─ submit-button.tsx      disables + shows spinner during pending Server Action
│  ├─ form-error.tsx         banner for top-level errors
│  └─ map-picker.tsx         'use client' — Leaflet + Nominatim (no Google key) — see below
├─ teams/
│  ├─ team-row.tsx           one row in the admin table
│  └─ admin-filter-bar.tsx   search + sport pill filter
└─ ui/
   ├─ button.tsx             variants: primary | secondary | accent | ghost
   ├─ status-dot.tsx
   ├─ pill.tsx
   └─ icon.tsx               wraps lucide-react with consistent 24x24 viewBox
```

## Asset migration (one-time copy)

From `C:\src\Projects\epl-coming-soon\` → `apps/web/public/` (**directly into `public/`, no subfolder**):

- `logo.png` — site header → referenced as `/logo.png`
- `hero-banner.jpg` — hero background → `/hero-banner.jpg`
- `card-cricket.jpg`, `card-badminton.jpg`, `card-volleyball.jpg` — sport cards → `/card-cricket.jpg` etc.
- `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png` — favicons (wire via `metadata.icons` in `layout.tsx`)
- `epl_logo.jpg` — keep as a fallback `og:image` → `/epl_logo.jpg`

Wire favicons in `app/layout.tsx`:

```ts
export const metadata: Metadata = {
  title: { default: 'EPL Season 2 (2026)', template: '%s · EPL' },
  description: '…',
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/favicon.ico' }],
    apple: '/apple-touch-icon.png',
  },
};
```

## Forms — Server Actions + zod

Co-locate every form schema in `lib/schemas.ts` so the same definition validates on the client (via `useFormState`) and on the server.

```ts
// lib/schemas.ts
export const signupSchema = z.object({
  identifier: z.string().refine(v => isEmail(v) || isIndianMobile(v), 'Enter a valid email or 10-digit mobile'),
  password:   z.string().min(8, 'Min 8 chars').regex(/[A-Z]/).regex(/[0-9]/),
});
export const loginSchema      = signupSchema;
export const teamRegisterSchema = z.object({
  sport:          z.enum(['cricket','badminton','volleyball']),
  apartmentName:  z.string().min(2).max(80),
  teamName:       z.string().min(2).max(60),
  captainName:    z.string().min(2).max(60),
  captainMobile:  z.string().regex(/^[6-9]\d{9}$/),
  apartmentLat:   z.number().min(-90).max(90),
  apartmentLng:   z.number().min(-180).max(180),
  apartmentAddress: z.string().max(300),
});
```

Server Actions live next to the page:

```
app/register/actions.ts        signupAction(formData)
app/login/actions.ts           loginAction(formData)
app/teams/register/actions.ts  registerTeamAction(formData)
```

Each action:
1. Parses with the zod schema (`schema.safeParse`).
2. Calls the .NET API (`POST /api/auth/register`, `/api/auth/login`, `/api/teams`) using `fetch` with `credentials: 'include'` + the forwarded cookie.
3. On 2xx, `revalidatePath` + `redirect`. On failure returns `{ ok: false, fieldErrors }` for the form to render.

## Mobile-or-email detection

```ts
export function isEmail(s: string)        { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
export function isIndianMobile(s: string) { return /^[6-9]\d{9}$/.test(s); }
```

In the API DTO, normalize to:
- `email = identifier` when `isEmail` ⇒ ASP.NET Identity uses `Email` + `UserName=Email`.
- `phoneNumber = identifier` when `isIndianMobile` ⇒ `UserName = "+91" + mobile`, `PhoneNumber = "+91" + mobile`.

Login walks the same fork and submits to `/identity/login` with either `email` or `username` populated. See [04-backend.md](./04-backend.md) for the exact .NET wiring.

## Google Map picker without an API key

The user explicitly does not want a Google Cloud project / API key. Two viable approaches — recommendation is **A**:

### A — Leaflet + OpenStreetMap tiles + Nominatim reverse-geocode (recommended)

- Add packages: `leaflet`, `react-leaflet`, `@types/leaflet`.
- CDN-load the Leaflet CSS in `app/layout.tsx` so we don't pull it into RSC.
- Center the map on Electronic City, Bengaluru: `[12.8456, 77.6603]`, zoom 14.
- User clicks → marker placed → call `https://nominatim.openstreetmap.org/reverse?format=json&lat=…&lon=…` to fill the human-readable address.
- Provide a "Use my current location" button (`navigator.geolocation.getCurrentPosition`).
- Render a small "Open in Google Maps ↗" link under the map: `https://www.google.com/maps?q=${lat},${lng}` — gives the user the Google look-and-feel without any key.
- Nominatim usage policy: include `User-Agent: epl-app/1.0 (contact)` header, ≤1 req/sec — we proxy the call through `/api/geocode/reverse` so we can centralize this.

### B — Google Maps embed iframe (no key)

```
<iframe src="https://maps.google.com/maps?q=12.8456,77.6603&z=15&output=embed" />
```

- Officially this works without a key, but it's read-only — there's **no click-to-pick event** and Google's TOS reserves the right to require a key. **Not used as the primary picker** — kept only as the "View on Google Maps" link.

### Captured fields

Stored on the `Team` record:

```ts
apartmentName:    string;
apartmentLat:     number;       // 6 decimals = ~10 cm precision
apartmentLng:     number;
apartmentAddress: string;       // Nominatim display_name, editable
mapProvider:      'osm';        // forward-compatible if we switch later
```

## Sport-card → registration deep link

`SportCard` clicks navigate to `/teams/register?sport=cricket` (etc.). The team-registration page reads `searchParams.sport`, locks the field, and shows the sport's accent color on the form's left rail (cricket = gold, badminton = cyan, volleyball = crimson — matches the reference page).

## Auth helpers

```ts
// lib/auth.ts (Server only)
export async function getCurrentUser() {
  const res = await fetch(`${API_INTERNAL_URL}/api/auth/me`, { headers: forwardCookieHeaders(), cache: 'no-store' });
  return res.ok ? (await res.json()) as MeDto : null;
}
export async function requireRole(role: 'Admin' | 'Player' | 'Umpire') {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (!me.roles.includes(role)) redirect('/'); // or `/403`
  return me;
}
```

Used as the first line of each gated `page.tsx`:

```ts
// app/teams/admin/page.tsx
export default async function AdminTeamsPage({ searchParams }) {
  await requireRole('Admin');
  const teams = await api.teams.list({ ...searchParams });
  return <TeamsAdminView teams={teams} />;
}
```

## Testing checklist (frontend)

- [ ] `npm run dev` → home page renders pixel-close to reference at 1440px, 1024px, 768px, 375px.
- [ ] Lighthouse: a11y ≥ 95, performance ≥ 90 desktop.
- [ ] Keyboard tab order: header logo → status → Register → topbar → sport cards (in order) → champion CTA → sponsor CTA → footer.
- [ ] `prefers-reduced-motion: reduce` flattens hero/ticker/streak animations.
- [ ] Map picker keyboard-accessible (arrow keys pan, Enter drops marker on focus square) — fallback to a manual address input if JS fails.
- [ ] Server Actions on slow-3G show the disabled spinner state for the duration of the request.
