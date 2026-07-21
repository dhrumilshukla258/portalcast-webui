# Socket.IO Connectivity & Device Casting — Skill Reference

Covers `SocketContext.tsx`/`useSocket.ts`/`SocketContextTypes.ts` (the single app-wide Socket.IO connection and device registry) and the cast-to-device feature spanning `useCasting.ts` (sender side, already briefly documented in `skill-video-playback.md`'s hook-split section) and `useCastReceiver.ts` (receiver side). Backend counterpart: portalcast-server's socket/device-registry service (`register`, `cast_command`, `active_devices`/`receivers` broadcasts).

---

## One socket, one identity, two roles

This is a single webapp — there's no separate "receiver build." Whether a given tab acts as a caster or a cast target is decided purely by `getIsReceiver()` in `SocketContext.tsx`: Tizen devices (`isTizenDevice()`) are always receivers; anything else becomes a receiver only via an explicit `?device=receiver` query param. `const isReceiver = getIsReceiver();` is called plainly in the component body — **not** wrapped in `useState`/`useMemo`, so it's technically recomputed on every `SocketProvider` re-render, not memoized once at mount. In practice it never changes mid-session because its inputs (`isTizenDevice()`, `window.location.search`) are themselves stable for the life of the tab, so it behaves as if fixed at mount — but don't describe it as actually memoized, and don't assume a client-side URL change (if this app ever adds one that touches the query string) would be ignored; nothing here would stop `isReceiver` from picking up a new value on the next render. A TV app pointed at this same webapp with that query param on its launch URL becomes a cast target; a phone/desktop tab without it is a controller.

Device identity (`device_id`) is a `uuidv4()` generated once and persisted to `localStorage` — it survives reloads and is what the receiver-list filtering uses to exclude "yourself" from the list of things you could cast to (`handleListUpdate` filters `r.id !== currentDeviceId`). It is **not** regenerated on logout/login — the same physical device keeps the same id across different accounts on it, which is deliberate (the registry is device-scoped, not account-scoped) but means device names in the admin/receiver list don't change identity just because a different user logs in on that device — only the display name does (see below).

## Registration fires twice, on purpose

On `connect`, the socket immediately emits `register` with a **generic** name (`"TV (a1b2)"` / `"Controller (a1b2)"`, built from role + first 4 chars of the device id) — this has to happen before auth necessarily resolves, since `user` comes from `AuthContext` which may still be loading. A second `useEffect`, gated on `[socket, isConnected, user?.name, user?.email, isReceiver]`, re-emits `register` once `user` is populated, this time with `user.name || user.email` as the display name. So every device shows up in the registry first under a generic name, then gets renamed a moment later once auth catches up — if you're chasing "why did the device list flicker from 'Controller (a1b2)' to 'dhrumil@...' right after connect," this is why, and it's expected, not a bug.

Because both emits are plain `register` with no idempotency concern, the server is expected to treat a repeat `register` for the same `id` as an update, not a duplicate entry — if devices start double-appearing in the list, check the server's dedup-by-id logic first, not this file.

## No auth gate on `register`/`cast_command` — unlike Logs/Stats socket rooms

`LogsTab.tsx`'s `start_logging` and `AdminStats`'s `start_portal_metrics` (see `skill-admin-panel.md`) require the admin JWT in the join payload and the server silently drops unauthenticated joins. **Device registration and casting have no equivalent check** — `register`/`get_receivers`/`cast_command` carry no token. Any tab that opens a websocket connection to this server can register as a device and appear in another user's receiver list, and any registered device can receive a `cast_command`. This is presumably intentional (local-network cast targets shouldn't need to log in), but don't assume the same fail-closed auth pattern documented for the admin rooms applies here — it doesn't, and adding a token requirement here would be a deliberate scope change, not a bug fix.

## Reconnection: `connect` handler re-fires and re-syncs everything

`reconnection: true` is set on the client, and socket.io re-fires its own `connect` event on every successful reconnect (not just the first connection) — so the same handler that does the initial `register` + `get_receivers` + `get_active_devices` runs again after a drop/reconnect, meaning there's no separate "did we just reconnect" branch needed and no stale-registration gap to patch. The `isConnected`-gated `useEffect` (the auth-aware re-register) also re-fires on reconnect for the same reason — `isConnected` genuinely flips false→true via the `disconnect`/`connect` handlers.

What **does** go stale during a disconnect: `receivers`/`activeDevices` are not cleared on `disconnect` — they just stop updating until the next broadcast or the reconnect's `get_receivers`/`get_active_devices` round-trip lands. A UI showing "Cast to..." during a brief disconnect will show the last-known list, including devices that may have themselves dropped off in the meantime — there's no local staleness/TTL check, it's whatever the server's last broadcast said.

## `castTo`/casting payload — sender side

`castTo` (in `SocketContext.tsx`) is a thin `socket.emit('cast_command', { targetDeviceId, command: 'play', payload: { ...content, playbackInfo } })` — fire-and-forget, no ack, no timeout/error path if the target device isn't actually listening or has since disconnected.

`useCasting.ts`'s `handleCast` builds `content` from whichever of `item`/`previewChannelInfo`/`channelInfo` is active (movie/series file vs. live-TV preview vs. live-TV playing) plus `streamUrl`/`rawStreamUrl` run through a local `formatUrl()` that absolutizes any relative path against `URL_PATHS.HOST || window.location.origin`. This absolutization matters specifically because the payload crosses to a **different device** over the socket — a relative URL that resolves fine in the sender's own browser context means nothing once decoded by the receiver's `playCastedMedia`, which has no shared routing context with the sender.

**Trap**: `handleCast` calls `toast.success('Casting started...')` unconditionally after the `if (castTo) { ... }` block — including when `castTo` is falsy (socket not yet connected) or when the emit silently fails for any other reason. The success toast is not a confirmation the receiver actually got or acted on anything; it only confirms the local emit call was attempted. Don't treat this toast as a sign the cast worked when debugging a "cast button does nothing" report — check the receiver's console/socket state instead.

## Receiver side — `useCastReceiver.ts`

Only binds its `receive_cast_command` listener when `isReceiver` is true — a controller-role tab never listens for this event at all, so nothing double-handles a stray cast command even though the socket connection itself is shared/generic. On `command === 'play'`, it calls the caller-supplied `playCastedMedia(media, streamUrl, rawStreamUrl, contentType)` and separately stashes `playbackInfo` (currentTime/volume/muted/track indices) into `pendingPlaybackState` rather than applying it directly — the actual player isn't necessarily mounted/ready yet at the moment the socket event arrives, so applying seek/volume state has to be a separate, later step driven by whatever consumes `pendingPlaybackState` once the player exists. If you're chasing "cast starts playback but ignores the sender's current position," check that the consumer of `pendingPlaybackState` is actually wired up and applies it after the player mounts, not before.

`useCastReceiver` only handles `command === 'play'` — any other `command` value in a `cast_command` payload is silently ignored (no default/error branch), so extending this to support e.g. pause/seek-only commands from the sender means adding a new branch here, not assuming the plumbing already forwards it.

---

## Key Files

- `src/context/SocketContext.tsx` — connection lifecycle, `register`/re-register, `receivers`/`activeDevices`/`activeUserCount` state, `castTo`, `refreshReceivers`
- `src/context/useSocket.ts` — `useSocket()` hook + context definition
- `src/context/SocketContextTypes.ts` — `Device`, `PlaybackInfo`, `SocketContextProps`
- `src/context/video/useCasting.ts` — sender-side `handleCast`, URL absolutization, extracted from `VideoContext.tsx` (see `skill-video-playback.md`)
- `src/hooks/useCastReceiver.ts` — receiver-side `receive_cast_command` listener, `pendingPlaybackState`
- `src/components/organisms/admin/AdminStats.tsx` / `src/hooks/useAdminStats.ts` — consumes `activeUserCount`/`activeDevices` for the "Connected now" stat (see `skill-admin-panel.md`)
