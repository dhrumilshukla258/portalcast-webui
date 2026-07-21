# Auth & Login — Skill Reference

Covers session/token management (`AuthContext.tsx`) and the Login page's three sign-in flows — credentials, Google Sign-In, and TV QR device-code — plus password reset. Backend counterpart: portalcast-server's `/auth/*` endpoints (signup, login, forgot/reset-password, Google verify, device code/poll).

---

## `AuthContext.tsx` — session state and persistence

- Token/refresh-token/user are all initialized synchronously from `webPlatformAdapter.storage` (`useState(() => authStorage.get(...))`) rather than an effect — the app needs to know on first render whether a session already exists, otherwise every route would flash a logged-out state before an effect fires.
- `loading` starts `true` and only flips once `refreshProfile()` has resolved (or been skipped, if there's no token) — this is what `ProtectedRoute` (`App.tsx`) waits on before deciding whether to redirect to `/login`. Don't remove the `loading` gate to "simplify" the initial-auth effect; a token existing in storage doesn't mean it's still valid server-side.
- `logout()` clears state, clears the three storage keys, and hard-navigates via `window.location.hash = '/home'` — not `navigate()` from react-router. This is deliberate: logout is also triggered from a global `window.addEventListener('auth-expired', ...)` listener (fired by the API client on a 401), which can happen from anywhere in the tree, including outside any router context that has a `navigate` available.
- The Google Sign-In SDK script (`accounts.google.com/gsi/client`) is injected once by `AuthProvider` itself on mount, app-wide — **not** by `Login.tsx`. `Login.tsx`'s own Google-button effect (see below) only polls for the SDK object to become available and renders the button once it does; it doesn't load the script itself. If Google Sign-In stops working, check that this injection effect hasn't been accidentally duplicated or removed, not just the button-render effect in `Login.tsx`.
- `value` is memoized — `AuthProvider` wraps the entire app, so an unmemoized object here would re-render every consumer (including ones that only read e.g. `token`) on every provider-level state change.

---

## `Login.tsx` — three sign-in flows, one page

`Login.tsx` itself is now composition + JSX only. The actual flows live in two hooks:

- **`src/hooks/useLoginForm.ts`** — credentials login, signup, forgot-password, and reset-password. All four share one set of form state (`email`/`password`/`credsError`/`signupSuccess`) and the same "clear error+success on any input change" behavior, which is why they're one hook rather than four. Both signup and reset-password validate against the same `PASSWORD_REGEX` (see below) before hitting the network.
- **`src/hooks/useTVDeviceFlow.ts`** — the QR/device-code flow for Tizen and other remote-only devices (see below). Owns `deviceFlow`/`deviceStatus` and the poll interval; starts/stops automatically based on `activeTab === 'tv'`.
- **`src/utils/passwordChecks.ts`** — `PASSWORD_REGEX` and `getPasswordChecks()`, shared by `useLoginForm.ts` (validation) and `PasswordStrengthChecklist.tsx` (the live checklist UI). This used to be two separate copies of the same regex/logic, one inline in the signup view and one in the reset-password view — real duplication (not just size), consolidated here so the two forms can't drift out of sync on what counts as a valid password.

`Login.tsx` itself still owns: `activeTab` state (`web`/`tv`/`forgot`/`reset`), the spatial arrow-key navigation effect (queries all visible focusable elements globally on every keypress — acceptable at this scale, gated by user input not a hot loop), and the Google Sign-In button-render effect.

### TV QR device-code flow

Tizen (and other remote-only) devices default `activeTab` to `'tv'` (`isTizenDevice()` check) since there's no practical way to type an email/password with a remote. The flow: `startTVDeviceFlow()` requests a `deviceCode`/`userCode`/`verificationUrl` pair from the backend, renders a QR code (via `api.qrserver.com`, no local QR library) encoding `verificationUrl` plus the human-readable `userCode` underneath, then polls `/auth/device/poll` every 4s with the `deviceCode`. On `status === 'authorized'`, the returned tokens are written directly to `webPlatformAdapter.storage` and the page does a **hard reload** (`window.location.reload()`) rather than calling anything on `AuthContext` — this is deliberate, it's simpler than trying to hydrate `AuthProvider`'s already-initialized state mid-session, and a full reload through the normal storage-read-on-mount path is exactly the same code path a real page load takes. On `status === 'expired'`, polling stops and the UI offers "Generate New Code" (calls `startTVDeviceFlow()` again).

Switching away from the `tv` tab (or logging in) clears the poll interval via the effect's cleanup — if you add a new tab value, make sure it still falls into the "not `tv`" branch of that effect or a stale poll will keep running in the background after the user navigates away.

### Reset-password token detection

`Login.tsx` checks `searchParams.get('token')` on mount and forces `activeTab` to `'reset'` if present — this is how the email reset link (`/login?token=...` or `/reset-password?token=...`, both routes render `Login`) lands the user directly on the reset form instead of the default tab. `useLoginForm`'s `resetToken` param is this same value, passed in from `Login.tsx` rather than read independently inside the hook, so there's one source of truth for "is this a reset-password page load."

---

## Key Files

- `src/context/AuthContext.tsx` — token/session state, `useAuth()`
- `src/components/pages/Login.tsx` — tab shell, spatial nav, Google button render
- `src/hooks/useLoginForm.ts` — credentials/signup/forgot/reset handlers
- `src/hooks/useTVDeviceFlow.ts` — QR/device-code polling
- `src/utils/passwordChecks.ts` — shared password validation regex + check breakdown
- `src/components/molecules/PasswordStrengthChecklist.tsx` — the live checklist UI, used by both the signup and reset-password views
