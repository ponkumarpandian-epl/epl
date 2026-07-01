# Season 2 Results Home Page — Design Spec

> **Status:** design approved in brainstorming; HTML mockup at [home-results.html](./home-results.html). No production code until this spec is reviewed.
> **Date:** 2026-07-01
> **Goal:** pivot the home page from "register now" to a results / celebration recap now that all three Season 2 games are complete, with an auto-playing Season 2 photo slideshow as the centerpiece.

---

## Decisions (locked in brainstorming)

| # | Decision | Choice |
|---|---|---|
| D1 | Standings data source | **Static typed data file in the frontend** (completed-season snapshot). No backend model, no migration. Clean seam left for a future API swap. |
| D2 | Page purpose | **Results + Season 2 recap.** All registration UI (sport cards, fees, register CTAs, "register for all 3" champion banner) is removed. |
| D3 | Gallery auto-play | **Cinematic full-bleed slideshow** (cross-fade + Ken-Burns, dots, arrows, pause-on-hover, reduced-motion fallback) reading the Season 2 storage container, with the existing bento grid + lightbox kept below as the browseable archive. |
| D4 | Visual direction | **Extend the existing dark + neon design system** (navy/crimson/gold, per-sport cyan/gold/crimson, Anton/Inter/JetBrains). One signature moment: the champion reveal. |
| D5 | Standings detail | **Full per-sport breakdown** (Cricket / Badminton / Volleyball / Participation / Bonus / Total / Gold / Silver), horizontally scrollable on mobile, top-3 highlighted. |

---

## The data (Season 2, 2026 — final)

**Overall champion:** GM Ecity Town — 890 pts (tied with Sriram Summit on 890; wins on gold count 1 vs 0).

**Per-sport podium** (gold = 320, silver = 240, bronze = 160 in that column):

| Sport | 🥇 Gold | 🥈 Silver | 🥉 Bronze |
|---|---|---|---|
| Cricket | RCC (320) | SNN (240) | GM Ecity Town & Sriram Summit — joint 3rd (160) |
| Badminton | SNN (320) | Sriram Summit (240) | GM Ecity Town (160) |
| Volleyball | GM Ecity Town (320) | Sriram Summit (240) | Esteem (160) |

Bronze note: two teams tie at 160 in each sport (the semifinal losers). Cricket is shown as **joint 3rd** (both); Badminton and Volleyball bronze were assigned by the organizer (GM, Esteem respectively).

**Full standings** — 15 teams. Columns: `rank, team, cricket, badminton, volleyball, participation, bonus, total, gold, silver`. Values transcribed from the official point-standings poster (see mockup table for the full 15 rows).

Ordering rule: by `total` desc, ties broken by `gold` desc then `silver` desc (matches the poster: GM > Sriram Summit at 890).

---

## Section flow

1. **Champion hero** *(signature)* — spotlight-from-above stage, the real **Champions 2026 trophy photo** ([trophy-champions-2026.png](./trophy-champions-2026.png)) in a gold-glow frame with a gentle float, "GM ECITY TOWN" in massive Anton with a gold shimmer sweep, a quiet confetti layer (disabled under `prefers-reduced-motion`), and three stat pills (890 pts · 1 gold · #1 of 15). *(Production note: this photo must be added to the Season 2 storage container / `public/` and whitelisted in `next.config.ts` `remotePatterns` if remote.)*
2. **Cinematic slideshow** — auto-advancing Season 2 photos, per-photo sport tag + caption, arrows/dots/pause, Ken-Burns drift, pause on hover and when tab hidden.
3. **Per-sport podium** — three glass cards (cricket=gold, badminton=cyan, volleyball=crimson accents) each showing gold + silver with medal discs and points.
4. **Standings table** — full breakdown; mono tabular figures; per-sport columns tinted with their accent; top-3 rows get medal-tinted left borders (gold/silver/bronze); champion row carries an animated gold sheen; gold/silver counts as chips; horizontal scroll on mobile.
5. **Recap strip** — "Thank you, Season 2" with stat counters (15 apartments · 3 sports · 3 titles · 1 crown).
6. **Gallery bento** — existing bento grid + lightbox archive (unchanged behavior).
7. **Sponsors** + footer.

---

## Design tokens (all from `apps/web/src/app/globals.css` — nothing new invented)

- **Color:** ink `#03081A` / navy `#060F26` / `#0A1838` surfaces; gold `#FFD15C` (champion + cricket); cyan `#3FA9F5` (badminton); crimson `#E83642` (volleyball); bone `#F2F0E6` text. Medal tints: silver `#C9D2DC`, bronze `#CD8B54`.
- **Type:** Anton (display, huge), Inter (body), JetBrains Mono (**all standings figures — tabular-nums, no layout shift**), Oswald (team names / sub-labels).
- **Motion:** `--ease` cubic-bezier(.2,.9,.3,1); 200–300ms micro-interactions; all decorative/looping motion (confetti, shimmer, Ken-Burns, autoplay) collapses under `prefers-reduced-motion: reduce`.

---

## Implementation shape (for the plan phase — not built yet)

Frontend-only. New/changed files under `apps/web/src/`:

- `lib/standings.ts` — typed static data (the 15-team table + per-sport podium + champion), exported as the single source of truth (D1 seam).
- `components/home/champion-hero.tsx` (+ css) — replaces `HeroBanner`/`HomeIntro`/`ChampionBanner` usage on the home page for the results context.
- `components/home/highlights-slideshow.tsx` (+ css) — client component; consumes the same `/api/gallery` items already fetched (filter/order for Season 2), autoplay logic mirrors the mockup script.
- `components/home/sport-podium.tsx` (+ css) — the three podium cards.
- `components/home/standings-table.tsx` (+ css) — the full-breakdown table.
- `components/home/season-recap.tsx` (+ css) — recap strip.
- `app/page.tsx` — recomposed to the results flow; registration sport cards + `RegistrationClosedNotice` + register-oriented `ChampionBanner` removed from this page.
- Reuse existing `GallerySection` / `GalleryGrid` (bento + lightbox) as-is for section 6.
- Reuse `SponsorsCta` (or a trimmed sponsors strip) for section 7.

**Gallery slideshow data:** the slideshow reuses the existing `GET /api/gallery` contract (Season 2 container is already listed). No backend change. If a Season-2-only filter is wanted, it's a frontend filter on `category`/URL prefix — confirm during planning.

**Accessibility floor:** keyboard-operable slideshow controls, visible focus rings (inherited), alt text on every photo (from gallery `alt`), table remains a real `<table>` (screen-reader friendly), color never the sole signal (medals use rank numerals + icons + text).

---

## Out of scope (YAGNI)

- No backend standings entity / migration / admin editing (D1).
- No Event-Grid cache invalidation, no admin upload UI (existing gallery follow-ups, unrelated).
- No new sponsor management — reuse whatever `SponsorsCta` renders today.
