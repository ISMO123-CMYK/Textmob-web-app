# AGENTS.md

Mobile app (Expo SDK 57 / RN 0.86.3 / TypeScript 6 strict).

## Verify

```bash
cd mobile
bunx tsc --noEmit    # package manager is bun (bun.lock); npx tsc won't resolve (.bin has tsc.exe only)
                      # cold-cache runs take ~7 min after node_modules changes
bunx expo-doctor     # dependency health (schema check is network-only: may fail offline)
bunx expo export --platform web   # full bundling smoke test -> git-ignored dist/
```

Run after every change. SDK 57 matches current Expo Go — test on device with
`bunx expo start --tunnel` (scan QR in Expo Go). Modules not bundled in Expo
Go (e.g. expo-share-intent) need a dev-client rebuild (`npx expo run:android`).

## Conventions

- TS strict, but `noUnusedLocals`/`noUnusedParameters` are off.
- PowerShell 5.1: no `&&`, use `; if ($?) { ... }`. Emoji `??` in output is
  display-only; source files are UTF-8.
- RN pitfalls: HTML entities only decode in JSX text children (never string
  props); no hover/select/prompt/confirm on RN → chip rows, always-visible
  affordances, modal prompts, `Alert.alert`.
- Theme via `useLoudaTheme()` → `{ isDark, p }`.
- Louda (messaging app) port lives in `src/louda/`; web source of truth is
  `../client/src/louda/LoudaApp.jsx` + `StatusComponents.jsx`. Import API as
  `import * as api from '../api'`.
- Voice/video calls intentionally remain a "coming soon" placeholder (scope
  decision — do not implement).

## Structure

- `src/navigation/RootNavigator.tsx` — stack; `Chats` screen mounts Louda.
- `src/screens/` — Textmob screens; `src/louda/` — Louda app (own store).
- `src/components/MobileHeader.tsx` — global header + unread badges.
