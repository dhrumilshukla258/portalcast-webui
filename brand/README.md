# PortalCast brand kit

One logo for every PortalCast client (webui, tv-android, and anything built later).
Use these files as they are. Do not redraw the logo or recolor it per app.

## The logo

- **Symbol.** A "P" drawn as a portal ring. The ring opens at the top right, two signal
  arcs leave through the gap ("cast"), and a play button sits inside the bowl.
- **Wordmark.** "portalcast" in lowercase, drawn by hand with rounded strokes that match
  the symbol. It is paths, not a font, so it renders the same everywhere.
- **Name in text.** Write the product name as **PortalCast**: app labels, page titles,
  store listings, alt text.

## Files

| File | Use it for |
|---|---|
| `svg/portalcast-logo.svg` | Symbol + wordmark on dark backgrounds (default) |
| `svg/portalcast-logo-on-light.svg` | Same, for light backgrounds |
| `svg/portalcast-symbol.svg` | Symbol alone, transparent: small spaces, loaders, avatars |
| `svg/portalcast-icon.svg` | App icon tile (rounded square, dark background) |
| `svg/portalcast-icon-maskable.svg` | Full-bleed square for masks: PWA maskable, Android adaptive, stores |
| `svg/portalcast-wordmark.svg` | Wordmark alone, only when the symbol is already on screen |
| `svg/portalcast-tv-banner.svg` | 16:9 TV launcher banner (Android TV 320x180dp, webOS, Tizen) |
| `png/portalcast-icon-{16..1024}.png` | Raster icons at common sizes |
| `png/portalcast-icon-maskable-{512,1024}.png` | Raster maskable icon |
| `png/portalcast-tv-banner-{640,1280}.png` | Raster TV banner |
| `png/favicon.ico` | 16/32/48 favicon |

## Colors

| Token | Hex | Where |
|---|---|---|
| Gradient start | `#22D3EE` | Symbol, top left |
| Gradient middle | `#3B82F6` | Symbol |
| Gradient end | `#7C5CFF` | Symbol, bottom right |
| Portal window | `#0B1226` | Disc behind the play button |
| Background | `#0E1530` (glow `#1A2B55`, edge `#080C1C`) | Icon tiles, banners, splash |
| Wordmark on dark | `#EAF2FF` | |
| Wordmark on light | `#0F172A` | |

The gradient runs diagonally across the symbol (userSpaceOnUse 16,10 to 88,92).

## Rules

- Keep clear space around the logo of at least the width of the play button.
- The symbol alone should be at least 16px; the full logo at least 96px wide.
- Do not add "TV", "Web" or other suffixes to the name or logo.
- Do not put the logo on busy imagery without a dark scrim behind it.

## Where each client uses it

- **webui** (`portalcast-webui/public/`): `portalcast-logo.svg` in the header and auth
  pages, `portalcast-icon.svg` and `favicon.ico` as favicons, `pwa-*.png`,
  `maskable-icon-512x512.png` and `apple-touch-icon-180x180.png` for install icons.
- **tv-android** (`app/src/main/res/`): `drawable-xhdpi/tv_banner.png` (TV banner),
  `mipmap-*/ic_launcher.png` (legacy icons), `mipmap-anydpi-v26/ic_launcher.xml` with
  `drawable/ic_launcher_foreground.xml` and `drawable/ic_launcher_background.xml`
  (adaptive icon), and `drawable/portalcast_logo.xml` (in-app lockup, used on pairing
  and sign-in screens through `PortalcastLogo()`). The Android vectors are hand
  translations of the SVGs; update them if the sources change.

## Changing the logo

1. Edit `src/symbol.svgfrag` (symbol) or `src/word.svgfrag` (wordmark).
2. Run `bash build.sh` to regenerate `svg/`.
3. Run `powershell -File export.ps1` to regenerate `png/` (needs Chrome or Edge).
4. Copy the outputs into each client as listed above.
