# 02 — Design System (EPL Dark Theme)

> **Authoritative reference:** `C:\src\Projects\epl-coming-soon\index.html`.
> The current `apps/web/src/app/globals.css` light "team red + gold" palette is **replaced** by the navy/crimson/gold dark palette below.
> All component CSS must consume tokens — **no inline hex values anywhere in JSX/TSX**.

## Action items

- [ ] Replace `apps/web/src/app/globals.css` with the token block below (keeping the Tailwind v4 `@theme inline` bridge).
- [ ] Archive `design-system/MASTER.md` → `design-system/MASTER.archived-light.md` and regenerate a new MASTER.md from these tokens.
- [ ] Copy reference assets **directly into** `apps/web/public/` (no subfolder): `logo.png`, `hero-banner.jpg`, `card-cricket.jpg`, `card-badminton.jpg`, `card-volleyball.jpg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`. Referenced from components as `/logo.png`, `/hero-banner.jpg`, etc.

## Color tokens

```css
:root {
  /* ── Brand foundations (from epl-coming-soon) ── */
  --navy-deep:    #061B3D;
  --navy-royal:   #0E2F66;
  --navy-steel:   #1A4A8C;
  --crimson:      #C8202F;
  --crimson-hot:  #E83642;
  --crimson-neon: #FF5F4D;
  --gold:         #E8B53D;
  --gold-bright: #FFD15C;
  --cyan:         #3FA9F5;
  --cyan-bright:  #7BC4FF;
  --cyan-neon:    #00DEFF;
  --ink:          #03081A;
  --ink-2:        #060F26;
  --ink-3:        #0A1838;
  --bone:         #F2F0E6;
  --bone-dim:     rgba(242, 240, 230, 0.7);
  --bone-fade:    rgba(242, 240, 230, 0.45);

  /* ── Semantic roles (the only names components should use) ── */
  --color-bg:            var(--ink);
  --color-bg-elevated:   var(--ink-2);
  --color-surface:       var(--ink-3);
  --color-text:          var(--bone);
  --color-text-muted:    var(--bone-dim);
  --color-text-subtle:   var(--bone-fade);
  --color-border:        rgba(232, 181, 61, 0.18);
  --color-border-strong: rgba(232, 181, 61, 0.45);

  /* primary / secondary / accent — what buttons, links and focus rings read */
  --color-primary:        var(--crimson);
  --color-primary-hover:  var(--crimson-hot);
  --color-primary-text:   var(--bone);

  --color-secondary:       var(--navy-royal);
  --color-secondary-hover: var(--navy-steel);
  --color-secondary-text:  var(--bone);

  --color-accent:        var(--gold);
  --color-accent-hover:  var(--gold-bright);
  --color-accent-text:   var(--ink);

  --color-link:        var(--gold-bright);
  --color-link-hover:  var(--bone);

  --color-focus-ring:  var(--gold-bright);

  /* Per-sport tints (used by sport cards + admin filters) */
  --sport-cricket:     var(--gold);
  --sport-badminton:   var(--cyan);
  --sport-volleyball:  var(--crimson);

  /* Status */
  --color-success: #34d399;
  --color-warning: #FBBF24;
  --color-danger:  var(--crimson-hot);

  /* Elevation (dark-mode tuned shadows) */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.45);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.50);
  --shadow-lg: 0 12px 28px rgba(0,0,0,0.55);
  --shadow-xl: 0 30px 60px rgba(0,0,0,0.55);

  /* Motion */
  --ease: cubic-bezier(0.2, 0.9, 0.3, 1);
  --fast: 200ms;
  --mid:  300ms;
}
```

```css
/* Tailwind v4 bridge so we can write bg-primary, text-accent, ring-focus */
@theme inline {
  --color-background:        var(--color-bg);
  --color-foreground:         var(--color-text);
  --color-surface:            var(--color-surface);
  --color-muted:              var(--color-text-muted);
  --color-primary:            var(--color-primary);
  --color-primary-foreground: var(--color-primary-text);
  --color-secondary:          var(--color-secondary);
  --color-accent:             var(--color-accent);
  --color-border:             var(--color-border);
  --color-ring:               var(--color-focus-ring);
  --color-danger:             var(--color-danger);
  --font-display: var(--font-anton, 'Anton', sans-serif);
  --font-sans:    var(--font-inter, 'Inter', system-ui, sans-serif);
  --font-mono:    var(--font-jetbrains-mono, 'JetBrains Mono', monospace);
}
```

## Typography

Replace the current Fira pair with the **reference page's** stack:

| Role | Font | Where it's used |
|---|---|---|
| Display (hero, sport names, section titles) | **Anton** + fallback Oswald | `font-display` |
| Subhead (titles inside cards) | **Oswald** 600 | use `font-display` with `font-semibold` |
| Body | **Inter** 300–700 | `font-sans` |
| Eyebrow / labels / status pills | **JetBrains Mono** uppercase + `letter-spacing: 0.22em` | `font-mono uppercase tracking-widest` |

Load via `next/font` in `apps/web/src/app/layout.tsx`:

```ts
const inter      = Inter({      subsets: ['latin'], weight: ['300','400','500','600','700','800'], variable: '--font-inter' });
const anton      = Anton({      subsets: ['latin'], weight: ['400'],                                variable: '--font-anton' });
const oswald     = Oswald({     subsets: ['latin'], weight: ['500','600','700'],                    variable: '--font-oswald' });
const jbMono     = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','700'],                variable: '--font-jetbrains-mono' });
```

## Spacing & radius

Keep the existing `--space-xs … --space-3xl` ramp from MASTER.md. Add radius tokens:

```css
:root {
  --radius-sm:   6px;   /* buttons, badges */
  --radius-md:   10px;  /* inputs, small cards */
  --radius-lg:   14px;  /* champion banner */
  --radius-xl:   18px;  /* sport cards */
  --radius-pill: 999px;
}
```

## Components (named patterns referenced by frontend plan)

### Buttons

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `btn-primary` (the red Register button) | `linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))` | `var(--color-primary-text)` | none | translateY(-2px) + bigger shadow |
| `btn-secondary` | transparent | `var(--color-link)` | `1.5px solid var(--color-border-strong)` | gold gradient sweeps in (see reference `register-btn`) |
| `btn-accent` (gold CTA) | `var(--color-accent)` | `var(--color-accent-text)` | none | `var(--color-accent-hover)` |
| `btn-ghost` | transparent | `var(--color-text-muted)` | 1px `var(--color-border)` | text→bone, border→gold |

All buttons share: `font-mono uppercase tracking-[0.22em] font-bold text-[12px] rounded-md cursor-pointer transition-all duration-[var(--mid)] ease-[var(--ease)]`.

### Inputs

```css
.field {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  padding: 12px 16px;
  font: 400 16px/1.4 var(--font-sans);
}
.field:focus { outline: none; border-color: var(--color-focus-ring); box-shadow: 0 0 0 3px rgba(255,209,92,0.25); }
.field-label { font: 500 11px var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-text-subtle); }
.field-error { color: var(--color-danger); font: 500 12px var(--font-sans); }
```

### Cards (sport / champion / form panel)

- `sport-card` — 3-column grid (meta / image / action), navy-to-ink gradient background, gold border on hover with `--accent-rgb` shifted per sport. **Copy directly from reference CSS** but replace `--gold`, `--cyan`, `--crimson` references with the semantic tokens (`--sport-cricket` etc.).
- `panel` (used by login/register/team-form) — `background: linear-gradient(160deg, var(--ink-2), var(--ink))`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lg)`.

### Sticky site header

Carry the reference design verbatim (navy gradient bar, thin gold accent line, logo + brand text + status dot + Register CTA). Token swap: any `rgba(232,181,61,…)` becomes `color-mix(in oklab, var(--color-accent) X%, transparent)` so the bar respects future token edits.

## Anti-patterns to enforce in PR review

- No `style={{ color: '#…' }}` or `bg-[#…]` inline literals — everything goes through tokens or Tailwind named utilities.
- No emoji icons. Use **Lucide** (`lucide-react`) — it's the closest match to the reference's vector style.
- No `transition: all` longer than 300ms; respect `prefers-reduced-motion` (the reference page already does this).
- Focus ring (`box-shadow: 0 0 0 3px rgba(255,209,92,0.25)`) must be visible on every interactive element.
- Touch targets ≥ 44×44 on mobile (header CTA already complies — keep that bar for form buttons too).

## Accessibility quick contrast check

| Pair | Ratio | Pass? |
|---|---|---|
| `--bone` (#F2F0E6) on `--ink` (#03081A) | 17.7:1 | ✅ AAA |
| `--bone-dim` on `--ink` | 12.4:1 | ✅ AAA |
| `--gold-bright` (#FFD15C) on `--ink` | 13.4:1 | ✅ AAA |
| `--crimson` (#C8202F) on `--bone` (used inside btn-primary) | 5.8:1 | ✅ AA large + small |
| `--gold` (#E8B53D) on `--ink` | 11.3:1 | ✅ AAA |

All primary text combinations clear WCAG AA easily; the only thing to watch is **muted text on `--ink-3`**, which still hits 9.6:1 — fine.
