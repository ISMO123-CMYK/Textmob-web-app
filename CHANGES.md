# Textmob — Changes Log

Date: August 4, 2026

Session scope: forgot-password email fix + auth UX features (save-credentials banner, redirect-after-login, username special-character support).

---

## 1. Password Reset Emails now use Resend (not nodemailer)

### Why
`nodemailer` SMTP (Gmail, port 465) times out on Render's free tier (`ETIMEDOUT`).
In-app/notification emails appear to work because `sendNotificationEmail` is
fire-and-forget (`transporter.sendMail(...).then().catch()` — errors swallowed),
while `/forgot-password` and `/reset-password` used `await transporter.sendMail()`,
so the failure surfaced as a 30s hang + 500.

### What changed
Resend is a pure HTTPS API (no SMTP), so it works on Render free tier.

**Files:**
- `package.json` — added `resend` (`^6.18.1`)
- `.env` — added:
  - `RESEND_API_KEY=re_WEZ7aYbs_MTCCZf8HLXmBVjhzs3Et6oQU`
  - `RESEND_FROM=onboarding@resend.dev`
- `server.js`:
  - `require("resend")` + `const resend = new Resend(process.env.RESEND_API_KEY || "...")`
  - `POST /forgot-password` — reset-code email now uses `resend.emails.send()`
  - `POST /reset-password` — confirmation email now uses `resend.emails.send()`

`RESEND_FROM` only delivers to the Resend account-verified email
(`gidadoismail24@gmail.com`) until you verify your own domain in Resend.
Set `RESEND_API_KEY` / `RESEND_FROM` in the Render dashboard — `.env` is not committed.

**Unchanged:** all other emails (welcome, notifications, new-login, weekly recap)
still go through nodemailer/SMTP.

---

## 2. Username Special Characters — URL encoding (existing users keep their handle)

### Why
Existing users may have usernames with characters (spaces, dots, hyphens, `%`, `/`)
that broke routing: unencoded `/profile/:username` routes and `/@username` SPA links.

### What changed
- **Server** (`server.js`):
  - `POST /signup` — NEW users validated with `/^[a-z0-9_]{3,30}$/`
    (existing users untouched, no forced rename/logout). Express already
    `decodeURIComponent`s `:username` route params, so existing encoded links work.
- **Mobile** (`mobile/src/api/auth.ts`):
  - `encodeURIComponent(username)` added to `/update`, `/change-password`,
    `/update-type`, `/notification-prefs` POST endpoints (GET endpoints already encoded).
- **Web client**:
  - `client/src/router/LexumRouter.jsx` — centralized `encodeNavPath()` helper now
    percent-encodes pathname segments in `navigate()` / `specialnavigate()`.
    Skips already-encoded segments (no double-encoding) and preserves query strings.
    This fixes every `/@username` link app-wide that routes through the SPA router.
  - `HallOfFameContent.jsx` and `SearchContent.jsx` — encoded the `window.location`
    fallback paths (which bypass the router).

### Frontend typing-time sanitization (NEW users — added after first pass)
While typing in the username field, input is cleaned on every keystroke —
**no emojis, no spaces, no uppercase, no special characters** — to guarantee
whatever is typed is always a valid, server-approved username:
- `mobile/src/screens/auth/SignupScreen.tsx` and
  `client/src/pages/auth/SignupForm.jsx` — `updateField('username', ...)`
  strips to `[a-z0-9_]` (lowercase + digits + underscore), caps at 30 chars.
- Auto-generated username from full name uses the same rule.
- `mobile/src/utils/validators.ts` and `client/src/utils/validators.js` —
  `isValidUsername` now matches the server rule exactly: `/^[a-z0-9_]{3,30}$/`.

---

## 3. "Save Credentials" Banner (top of feed)

### Behavior
After login/signup when the user did NOT use "remember me", a styled banner appears
at the top of the Home feed: **Save your login details?** → Save / No thanks.
- **Save** — writes `{ username, password, profile_pic }` to saved accounts
  (case-insensitive dedupe), dismisses permanently.
- **No thanks** — dismisses permanently.
- Banner persists until the user makes a choice (no auto-dismiss).

### Files
- `mobile/src/utils/storage.ts` — new keys: `CREDENTIALS_BANNER_DISMISSED`,
  `PENDING_CREDENTIALS`, `PENDING_REDIRECT`
- `mobile/src/context/AuthContext.tsx` — on `login()`/`signup()`, stash credentials
  into `PENDING_CREDENTIALS` only if the account isn't already in saved accounts;
  cleares on `logout()`
- `mobile/src/components/SaveCredentialsBanner.tsx` — **new** component
- `mobile/src/screens/home/HomeScreen.tsx` — renders the banner between
  `MobileHeader` and the tab bar (only when a user is logged in)

---

## 4. Redirect After Login (web + mobile)

### Why
A user landing on a protected URL gets sent to /auth; after signing in they should
return to the page they originally wanted.

### Web
- `client/src/components/layout/AppWrapper.jsx` — before routing unauth'd users to
  `/auth`, stores `pendingRedirect = pathname + search` in localStorage
  (not overwritten if already set)
- `client/src/pages/auth/AuthPage.jsx` — reads `pendingRedirect`, passes to `LoginForm`,
  uses it in the auto-login (saved-account) flow too
- `client/src/pages/auth/LoginForm.jsx` — after login, `window.location.href = redirect || '/'`
  and clears `pendingRedirect`

### Mobile
- `mobile/src/navigation/AuthStack.tsx` — `Login` / `Signup` accept
  `{ redirect?: string }` params
- `mobile/src/screens/auth/LoginScreen.tsx` — on successful login, stashes the
  redirect into `PENDING_REDIRECT`
- `mobile/src/screens/auth/SignupScreen.tsx` — same on post-signup login
  (+ added `storage`/`KEYS` import)
- `mobile/src/screens/home/HomeScreen.tsx` — on mount (user logged in), consumes
  `PENDING_REDIRECT`, navigates to the target screen, clears it.
  (Storage-based instead of `navigation.reset()` because after login the app
  swaps `AuthStack` → `RootNavigator` reactively, so a cross-navigator reset
  can't target `RootNavigator` screens.)

---

## Verification done
- `server.js`: `node --check` passes; server boots, `✔️ Mailer ready`
- Mobile: `tsc --noEmit` — no new type errors introduced (all listed errors are pre-existing)
- Web client: `vite build` succeeds

## Toolchain notes (be careful with these)
- Server = **pnpm** (root). Mobile = **bun**. Client (vite) = **pnpm** (standalone
  lockfile at `client/`).
- `client/node_modules` was reinstalled after an accidental deletion during this
  session. Final working state confirmed with `vite build`.