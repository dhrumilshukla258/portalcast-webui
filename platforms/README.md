# PortalCast for LG (webOS) and Samsung (Tizen) TVs

LG TVs from 2020 (webOS 5, Chromium 68) and Samsung TVs from 2020 (Tizen 5.5) on. LG sets from
2018–2019 (webOS 4.x, Chromium 53, no ES modules) are not supported (owner, 2026-10-25).

## How it works

Like Jellyfin's TV apps, each app is a small launcher (`launcher/index.html`): it asks once for
the PortalCast server's address (`http://192.168.1.10:3000`), checks that it answers, saves it,
and opens the web UI from that server. The TV always runs the server's own web UI, updated with
the server, with nothing to reinstall. Later launches show "Connecting to …" for 1.5 s; OK on
"Change server" (or a server that does not answer) brings the address screen back.

On a TV the web UI is the Android TV app's design, not the browser's (`isTvApp()` in
`src/utils/helpers.ts`; LG: "Web0S" in the user agent or `PalmSystem` / `webOSSystem`; Samsung:
`tizen`, or "SMART-TV … Tizen" in the user agent, as the page opened from the server has no
`tizen`):

- drawn at 1280×720 and scaled up (LG: `resolution` in `appinfo.json`; elsewhere zoomed,
  `main.tsx`), as the Android TV app's 1.5× on a 1080p TV;
- the remote moves as there (`src/tv/remote.ts`): nearest element per arrow, rows / tabs / chips
  remembered, Up stops at the chips then the tabs, resting on a tab opens it, holding OK opens the
  title menu, Back closes what is open, then goes to the tabs, then out; LG's pointer focuses what
  it points at;
- the screens (`src/tv/`): header with text tabs, Home with the hero following the focused card,
  title pages (movie; series with seasons and episodes), Live TV (groups, channels, what is on).

Keys: Back is 461 (LG; `disableBackHistoryAPI` in `appinfo.json`, so webOS gives the key to the
app instead of going back in browser history) or 10009 (Samsung); channel up/down 33/34 (LG) or
427/428 (Samsung); play, pause, stop, rewind, fast forward and the colour keys share codes.

Streams: LG goes through the server as a browser does; Samsung plays the portal's links directly.

## Make the app folders

```sh
npm run tv-apps        # dist-tv/webos and dist-tv/tizen
```

### LG

Needs LG's CLI (`npm i -g @webos-tools/cli`) and, on the TV, the **Developer Mode** app from the
LG Content Store, signed in with an LG developer account (free), Dev Mode on.

```sh
ares-package dist-tv/webos -o dist-tv              # dist-tv/com.portalcast.tv_1.0.0_all.ipk
ares-setup-device                                   # add the TV: its IP, port 9922, user prisoner
ares-novacom --device <name> --getkey               # passphrase shown in the Developer Mode app
ares-install --device <name> dist-tv/com.portalcast.tv_1.0.0_all.ipk
ares-launch --device <name> com.portalcast.tv
```

Developer Mode expires after 50 hours unless extended in the app. For good: the LG Content Store
(LG Seller Lounge).

### Samsung

Needs Tizen Studio with the TV extension (or its `tizen` CLI) and a Samsung certificate (Tizen
Studio's Certificate Manager, a Samsung developer account), the TV in Developer Mode (Apps,
type 12345, your PC's IP).

```sh
tizen package -t wgt -s <certificate profile> -- dist-tv/tizen     # dist-tv/tizen/PortalCast.wgt
sdb connect <tv ip>
tizen install -n PortalCast.wgt -- dist-tv/tizen
tizen run -p PrtlCast01.PortalCast
```

For good: the Samsung Galaxy Store / Seller Office.

## Files

| File | |
|---|---|
| `launcher/index.html` | address screen and redirect (plain ES5, no build step), both TVs |
| `launcher/logo.svg` | `brand/svg/portalcast-logo.svg` |
| `webos/appinfo.json` | id `com.portalcast.tv`, 1280×720, Back key to the app |
| `webos/icon.png`, `largeIcon.png` | 80 and 130 px, from `brand/png/portalcast-icon-1024.png` |
| `tizen/config.xml` | package `PrtlCast01`, Tizen 5.5, internet and remote keys |
| `tizen/icon.png` | 512 px, from the brand kit |
