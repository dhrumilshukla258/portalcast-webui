# Themes

The web app's look is picked in the profile menu (Theme) and saved with the account. The TV
apps always use Classic. A theme is three layers, from cheapest to most work:

| Layer | Where | What it changes |
|---|---|---|
| Tokens | `src/themes/<id>/theme.css`, `@layer theme` | colours, text sizes, font, control height, corner radius, label style, motion, focus ring, selection, glass, scrollbars, the title page's open / close motion |
| UI pieces | `src/components/ui/` (`Dialog`, `Button` primary / accent / danger / secondary / link, `Chip`, `SearchField`, `Toaster` (notifications), `.ui-accent`, `.ui-brand`, `.ui-row`, `.ui-label`, `.ui-badge`, `.ui-glass`, side panels `.pc-panel` / `.pc-row` / `.pc-section`) | drawn only from tokens; a theme overrides a rule only when no token can say it |
| Parts | `src/themes/registry.ts` | whole components a theme draws its own way (Header, Hero, Card, ContinueCard...) |

`html[data-theme="<id>"]` carries the choice to CSS (`src/themes/theme.ts`). `index.html` sets it
from this device's last choice before the first frame, so the intro (its own small
`html[data-theme]` block, since it plays before the app's CSS) and the page start in the theme.
The browser's bar colour is the theme's `swatch.page`.

## Semantic colours

Use what a colour is for, not what it is. Classic's values point at the palette it always used
(`src/index.css`), so moving a screen to these changes nothing in Classic.

| Token (Tailwind class) | For |
|---|---|
| `page` (`bg-page`) | the page behind everything |
| `panel`, `panel-raised`, `panel-hover` | fields and chips; rows and cards; their hover |
| `line`, `line-strong` (`border-line`) | hairlines; outlines that must show |
| `fg`, `fg-soft`, `fg-muted`, `fg-subtle` (`text-fg-muted`) | text, from most to least important |
| `accent`, `on-accent` | links, selected chips, progress; text on them |
| `focus` | focus rings and hover outlines (`ring-focus`, `border-focus/60`) |
| `live` | the LIVE badge |

Translucent white or black overlays (`bg-white/10`, `bg-black/60`) are fine as they are: they
read the same on any dark theme.

Text sizes come from the scale (`text-3xs` 10px, `text-2xs` 11px, `text-xs`... in Classic), never
`text-[11px]`: a theme sets the scale, and a fixed size ignores it.

## Moving a screen over

1. A modal becomes `Dialog` (overlay, panel, Escape, click outside). Buttons, chips and search
   inputs become `Button` (main action `accent`, destructive `danger`), `Chip`, `SearchField`.
   Accent gradients become `.ui-accent`; the sign-in pages' purple `.ui-brand` / `.ui-brand-text`.
2. A list entry gets `ui-row` (layout utilities stay); a group heading `ui-label`; a tag `ui-badge`.
3. Raw palette classes become semantic ones: `text-white` -> `text-fg`, `text-gray-400` ->
   `text-fg-muted`, `bg-surface-5` -> `bg-panel`, `text-sky-400` -> `text-accent`...
4. Check it in both themes.

New code starts this way. What is left (raw palette classes, 2026-11-18): admin ~800, the
sign-in and other pages ~140, player controls ~50, and Classic's own header and cards (only
Classic draws them). Until moved, each theme's "palette fallback" block recolours them; move a
screen when you are changing it anyway.

## Focus, selection, motion

- Keyboard / remote focus (`.focused`, set by `useTVFocus` after arrow keys): `--ui-focus-ring`,
  `--ui-focus-border`, `--ui-focus-glow`. The picked entry of a list: `.ui-selected` with
  `--ui-selected-bg` / `-fg`. Never a raw blue: Minimal has none.
- Title pages grow out of their card (`TitlePageLayer`, Web Animations, compositor only, so
  at the display's own rate, 120 Hz on ProMotion in Chromium): `--ui-title-open-ms` /
  `-ease`, `--ui-title-close-ms` / `-ease`, `--ui-title-fade`. An easing the browser cannot
  run falls back to Classic's. Minimal's are SwiftUI-style springs written as `linear()`.

## Glass

`.ui-glass` (and side panels) blur what is behind them: `--ui-glass-bg`, `--ui-glass-blur`,
`--ui-glass-edge`. Keep it to a few large surfaces (bars, menus, panels), never per card: each
blurred element is its own pass over what is behind it. Without blur support, or with Reduce
Transparency on, they turn solid. Never put glass inside glass: a blurred element only blurs
what is inside a blurred parent, so a menu inside the header shows the page unblurred (draw it
beside the header, as MinimalHeader does). Minimal floats its header over the page so content scrolls
under the glass (`minimal/theme.css`, "Glass needs something behind it"); a page whose scroll
box is not `#app-content-scroll` or `.tv-page` simply starts below the header.

## Adding a theme

1. Add `{ id, label }` to `THEMES` in `theme.ts`.
2. Copy `minimal/theme.css` to `<id>/theme.css`, change the selector and the values, and import
   it in `src/index.css` next to the others. Theme CSS must be imported there, not from a
   component: `postcss.config.mjs` turns cascade layers into selector weight per file, so a
   separately imported file loses to Tailwind's own rules.
3. Optionally, list its own parts in `registry.ts`.
