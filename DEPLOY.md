# Textmob — Release & Deploy Guide

How to ship a new Android build and push it to every user in the app.

## Architecture (30 seconds)

| Piece | Where | What happens |
| --- | --- | --- |
| Version data | Supabase `app_versions` table (single `current` row) | Source of truth for what version is live |
| Server | `server.js` on Render (`textmob-provider-api-99ii`) | Serves `GET /api/app-version`, `POST /api/admin/app-version`, and the APK at `/apk/` |
| Admin panel | `/asilfcismail` → **App Updates** tab | Publishes a new version |
| App | `mobile/` (React Native/Expo) | Checks version on launch; warns users, then blocks updates |
| APK file | `public/apk/thetextmobapp.apk` (committed to git) | Downloaded and installed by the app |

A release = bump version → build APK → drop APK in `public/apk/` → commit & push → publish in admin panel.

---

## 0. First-time setup (only once)

1. In Supabase SQL Editor (project `apnnyqmsyxuyapamnrqg`), run the contents of `app_versions.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.app_versions (
  id text PRIMARY KEY DEFAULT 'current',
  version text NOT NULL,
  apk_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  grace_days integer NOT NULL DEFAULT 7,
  published_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
```

2. Verify the server sees it: open `https://textmob-provider-api-99ii.onrender.com/api/app-version` (or `http://localhost:5000/api/app-version`). It should return `{"version":null,...}` — not an empty/error page. `null` is fine; the table existing is what matters.

---

## 1. Bump the version

From the repo root:

```sh
node bump-version.js            # minor: 1.0 → 1.1, 1.1 → 1.2, ...
node bump-version.js major      # major: 1.9 → 2.0
node bump-version.js patch      # patch: 1.5 → 1.5.1
node bump-version.js 1.7        # exact version
```

The script updates **both** `mobile/app.json` (`expo.version` + `android.versionCode`) and `mobile/package.json`, so every build carries one consistent number. `versionCode` increments automatically — Android needs this to treat a reinstall as an upgrade.

---

## 2. Build the APK

```sh
cd mobile
npx eas build -p android --profile production
```

- `production` (and `preview`) is configured to output an **APK** in `mobile/eas.json` — no Play Store required.
- When the build finishes, download the APK from the EAS link.
- First build asks you to log in to an Expo account. If EAS reports the project isn't linked, answer yes to `eas init`.

---

## 3. Ship the APK to the server

1. Rename the downloaded file to exactly:

```
thetextmobapp.apk
```

2. Replace the old file at `public/apk/thetextmobapp.apk`.

3. Commit & push (Render auto-deploys the server on push):

```sh
git add mobile/app.json mobile/package.json public/apk/thetextmobapp.apk
git commit -m "Release v1.1 (bump version, new APK)"
git push
```

**Constraints:**
- APK must be **under 100 MB** (GitHub file-size limit). If EAS produces a bigger file, enable the shrink option in `mobile/eas.json` or remove `--profile production` assets — the app is currently < 100 MB.
- The APK is served at `/apk/thetextmobapp.apk`. Verify after deploy: `https://textmob-provider-api-99ii.onrender.com/apk/thetextmobapp.apk` starts downloading.
- Commit the version files **before** building the APK, so the APK's embedded version always matches the committed one.

---

## 4. Publish (make it live)

1. Open the admin panel: `https://textmob-provider-api-99ii.onrender.com/asilfcismail` → **App Updates**.
2. Enter:
   - **New app version** — must be the same as the built version (e.g. `1.1`).
   - **Grace days** — usually `7`. Users get a dismissible reminder until this deadline.
   - **APK URL** — leave empty to use the default `/apk/thetextmobapp.apk` (recommended).
   - **Notes** — shown to users in the update prompt ("What's new").
3. Press **Publish** → you should get "Update published".

The publish timestamp and deadline (published + grace days) are computed automatically and shown in the panel.

---

## 5. What users see (in-app behavior)

| User version | Behavior |
| --- | --- |
| On the published version | Nothing — no prompt |
| Older version, within grace days | Small reminder banner, can dismiss / "Later" (24 h snooze) |
| Older version, past deadline | Blocking update screen — must open the APK page to download the new build |

Update checks run on app launch. Downloads stream to the device, then trigger Android's installer via the file manager, with an "Install unknown apps" permission prompt the first time.

---

## 6. Releasing a fix / rolling back

- **New build (recommended):** follow steps 1–4 with a higher version (`patch` for hotfixes).
- **Rollback:** publish the *previous* version + old APK. Note: users already on the newer version won't see prompts (app compares server version against itself), so rollback only reaches users still on even older builds. A forward hotfix is almost always better.

---

## 7. Checklist (full release, one screen)

1. `node bump-version.js` → prints new version.
2. `cd mobile && npx eas build -p android --profile production` → download APK.
3. Replace `public/apk/thetextmobapp.apk`, `git add` version files + APK, commit, push.
4. Confirm Render deploy finished; hit `/apk/thetextmobapp.apk` downloads.
5. `/asilfcismail` → App Updates → **Publish** with version, notes, default APK URL.
6. Optional sanity check on a spare device: `npm run start` in `mobile/` or install the APK manually — you should see the update prompt.

---

## Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `/api/app-version` returns `{"version":null}` forever | `app_versions` table missing → run the SQL in step 0. |
| Publish in admin panel returns error 500 | Same — table missing, or last line of the SQL editor error. Re-run step 0. |
| App says update, but download/install fails | Check `/apk/thetextmobapp.apk` is downloadable; check APK < 100 MB; on device allow "Install unknown apps" for the file manager app used. |
| No prompt appears in the app | App version equals published version (expected), or APK you installed was built after the publish and already embeds the new version. |
| Changed `server.js` locally, stuff now 500s | Restart the local server (Node has no hot reload): kill the node process on port 5000 and run `node server.js` again. |