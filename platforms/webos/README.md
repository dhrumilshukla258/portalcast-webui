# PortalCast for LG TVs (webOS)

LG TVs from 2020 on (webOS 5, Chromium 68, and newer). Sets from 2018–2019 (webOS 4.x,
Chromium 53, no ES modules) are not supported (owner, 2026-10-25).

## How it works

The app is this folder only: `index.html` asks once for the PortalCast server's address
(`http://192.168.1.10:3000`), checks that it answers, saves it, and opens the web app from that
server. So the TV always runs the server's own web UI, updated with the server, with nothing to
reinstall. Later launches show "Connecting to …" for 1.5 s; pressing OK on "Change server" (or
a server that does not answer) brings the address screen back.

The web UI knows it is on an LG TV (`isWebOSDevice()` in `src/utils/helpers.ts`: "Web0S" in the
user agent, or `PalmSystem` / `webOSSystem`) and behaves as the Samsung app does (`isTvApp()`):
pairing-code sign-in, remote focus, TV player controls, Back twice on Home to exit. LG's keys:
Back 461 (`disableBackHistoryAPI` in `appinfo.json`, so webOS gives the key to the app instead of
going back in browser history itself), Channel up/down 33/34; play, pause, stop, rewind, fast
forward and the colour keys use the same codes as Samsung's. Streams go through the server, as in
a browser (a Samsung TV plays the portal's links directly).

Away from home: the TV cannot run WireGuard inside an app; connect the TV (or the router) to
your VPN and use the server's VPN address.

## Package and install

Needs LG's CLI (`npm i -g @webos-tools/cli`) and, on the TV, the **Developer Mode** app from the
LG Content Store, signed in with an LG developer account (free), with Dev Mode on.

```sh
ares-package platforms/webos -o dist-webos         # makes dist-webos/com.portalcast.tv_1.0.0_all.ipk
ares-setup-device                                   # add the TV: its IP, port 9922, user prisoner
ares-novacom --device <name> --getkey               # passphrase shown in the Developer Mode app
ares-install --device <name> dist-webos/com.portalcast.tv_1.0.0_all.ipk
ares-launch --device <name> com.portalcast.tv
```

Developer Mode expires after 50 hours unless extended in the Developer Mode app. Other ways to
install for good: the LG Content Store (submission), or the Homebrew Channel on rooted sets.

## Files

| File | |
|---|---|
| `appinfo.json` | id `com.portalcast.tv`, 1920x1080, Back key to the app |
| `index.html` | address screen and redirect (plain ES5, no build step) |
| `icon.png`, `largeIcon.png` | 80 and 130 px, from `brand/png/portalcast-icon-1024.png` |
| `logo.svg` | `brand/svg/portalcast-logo.svg` |
