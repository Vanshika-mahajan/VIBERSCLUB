# DESIGN.md: Vibers Club

The design system for the Vibers Club website (`apps/web`). Read this before building or restyling any screen. The code is the source of truth for exact values: tokens live in the `@theme` block of `apps/web/app/globals.css`, and editorial overrides live in `features/club/club.module.css`.

## 1. Visual theme and atmosphere

Vibers Club is AI-assisted travel and community discovery for Manali, and its members are "Vibers". The site reads like an **editorial travel magazine**: one long scrolling "issue" with numbered chapters (I to VII), generous whitespace, big display type, hairline rules and warm paper tones.

- The mood is warm, calm and human. It should feel like golden hour in the mountains, not a tech dashboard.
- Avoid the SaaS look: no rounded card grids, heavy shadows, glassmorphism, neon glows or decorative gradients.
- Pictures and motion carry the emotion. The interface around them stays quiet.
- Entry: the site opens on a cinematic, painted 3D scene (`/`, `features/intro`). "A World Awaits", a door opens onto the living Vibers World, and a paraglider's canopy hands over to Home.

## 2. Colour palette and roles

Two colours dominate. The other two are used sparingly.

| Name | Hex | Token | Role |
|---|---|---|---|
| Warm Ivory | `#F7F2E8` | `--color-ivory`, `--color-canvas` | The page. Type on dark bands. |
| Deep Espresso | `#2A1B13` | `--color-espresso`, `--color-ink`, `--color-cta` | Type, icons, hairlines, primary buttons, dark bands. |
| Sage | `#879A6B` | `--color-sage` | Atmosphere only: washes, bands, photo toning. Never body text. |
| Amber Glow | `#D5851F` | `--color-amber`, `--color-highlight` | A tiny jewellery accent: the headline's full stop, active dots, the contents marker, counts. |

Supporting tokens:
- **Surfaces:** recess `#FBF8F1` (inputs, wells), canvas `#F7F2E8` (page), surface `#EFE8DA` (panels), raised `#F2ECDF` (hover, menus), sand `#E9E1D0`.
- **Type:** ink `#2A1B13` (headings), ink2 `#4A382C` (body), muted `#6B5A4D` (metadata), silver `#A89B8C` (disabled).
- **Lines:** `rgba(42,27,19,.14)` for hairlines, `rgba(42,27,19,.30)` for stronger rules.
- **Sage family:** sage-ink `#5E6E48` (small labels such as `.kicker`), sage-num `#798B5E` (oversized numbers only, 3.3:1), olive `#343824` (deep atmospheric bands, ivory type on it).
- **Readable accent:** `#8A4F0C` is dark amber for small text and icons, because Amber itself fails contrast as text.
- **Status:** ok `#3F5A2A`, warn `#8A4F0C`, danger `#A8261C`.

Rules:
- Everything must meet **WCAG AA** contrast. The e2e sweep fails on serious axe violations.
- **Photos stay colourful.** Do not tint people or places green. Sage toning is only for atmospheric pictures (luminosity onto `#64754B`).
- The Earth stays blue as it is.
- Mark every dark full-bleed block with `data-tone="dark"`. The contents navigation switches between ivory and espresso by reading it.

## 3. Typography

| Use | Font | Notes |
|---|---|---|
| Display: headlines, chapter titles, the wordmark | **Syne** (variable), weight 700 | Tight tracking (`-0.035em` on big headlines), line height about 0.98. |
| Text: body, UI, labels | **Inter** (variable) | Body 15 to 17px, line height 1.5 to 1.6. |
| The old journey (door and Earth) only | Fraunces and Manrope | Kept as they were. Do not use them elsewhere. |

- Hierarchy comes from size and weight contrast: huge Syne against small, quiet Inter.
- Section labels (`.kicker`) are small, uppercase or letter-spaced, in sage-ink.
- Chapters are numbered with roman numerals (I to VII) from `lib/nav.ts`.
- Large numbers can use sage-num.

## 4. Components

**Buttons**
- The primary button is Deep Espresso with ivory type. Controls are square or near-square (`border-radius: 0` to `2px`).
- On hover the fill sweeps in from the left and the arrow steps forward. Focus shows a 2px amber outline, offset by 3px.
- A secondary button is a 1px espresso outline on ivory.
- The one exception is the entry's **"Unveil What Awaits"** button. At ARPIT's request it is a raised espresso slab with a 14px radius, a soft shadow, a slow sheen and an amber arrow key.
- Pills (`999px`) are only for chips, tags and avatars.

**Cards and panels**
- Use hairline borders, not shadows: `--shadow-card: none`.
- Only floating things (menus, sheets) get `--shadow-soft`.
- Full-width colour bands use `.vc-panel`, `.vc-panel--espresso` and `.vc-panel--olive`. They break out of the column with `.vc-bleed`.

**Navigation: the contents**
- A Shopify-Editions-style contents list (`components/contents/Contents.tsx`).
- It sits centred over the Home opening, then animates (FLIP) to dock in the corner.
- On phones it becomes a strip along the bottom.
- The chapter in view is underlined with `aria-current="location"`.

**Inputs**
- Recess background with a hairline border and square corners.
- Labels are small Inter in ink2.

**Chips and tags**
- A pale sage wash (`--color-accent-wash`) with espresso type.

**Texture**
- A fine film grain sits over the whole page (`body::after`). Keep it subtle.

## 5. Layout

- **Page column:** up to 64rem wide. On wide screens it keeps clear of the docked contents through the `--main-ml` and `--main-pl` variables.
- **Home** is one long issue, chapters I to VII: Your vibe, Vibers like you, This week, Day plans, Discover, Events, Explore. Discover, Events and Explore also keep their own routes.
- **Rhythm:** big vertical spacing between chapters, hairline rules between sections, and asymmetric editorial layouts (a large picture beside narrow text).
- **Route files** in `app/` stay thin. Screens live in `features/<area>/`, with styles in CSS modules.

## 6. Depth and elevation

- The UI itself is flat: surfaces, hairlines, and no stacked shadows.
- Depth belongs to **pictures and 3D scenes**:
  - the entry's painted world in three.js, with parallax, wind and a real 3D door
  - the Home opening's two Vibers, stardust and the live planet
  - the Discover sphere
- Light in scenes is warm and low, like golden hour.

## 7. Motion

- Use GSAP (`lib/motion/gsap.ts`) for timelines and three.js on GSAP's ticker for scenes. Lenis is only for marketing pages.
- Motion feels cinematic and unhurried:
  - eases are power2 or power3 inOut, and sine for gentle swings
  - reveals take 0.4 to 0.9s
  - scene transitions take 1.5 to 2s
- Everything alive moves softly and continuously: wind in leaves and grass, breathing people, drifting mist.
- **Reduced motion:** always provide a still or fade alternative. Without WebGL, show the painted stills.
- Review motion in a production build (`pnpm build && pnpm start`), not in dev.

## 8. Responsive behaviour

- Design for phone first (Pixel 7 width), then tablet and desktop.
- No sideways scrolling at any width. The sweep test checks phone, tablet and desktop.
- On phones, the contents becomes a bottom strip. The entry centres on the door, with the headline at the top and the button at the bottom.

## 9. Do and don't

Do:
- Let ivory and espresso dominate.
- Use one amber accent per view.
- Use generous whitespace, hairlines, big Syne headlines and colourful photos.

Don't:
- Use rounded cards, heavy shadows, glass, neon, decorative gradients or childish styling.
- Use sage as text.
- Put an apostrophe in a comment inside the Tailwind `@theme` block. It silently drops every token after it.
- Reformat whole existing files with Prettier.

## 10. Prompt guide for AI tools

> Build in the Vibers Club editorial style: Warm Ivory `#F7F2E8` page, Deep Espresso `#2A1B13` type and square buttons, Sage `#879A6B` only for atmospheric bands, one tiny Amber `#D5851F` accent. Syne 700 for big tight headlines, Inter for text. Hairline borders instead of shadows, generous whitespace, magazine-style asymmetric layouts, colourful photos. WCAG AA contrast, no sideways scroll on phones, a reduced-motion fallback for every animation.
