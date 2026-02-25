# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview
BoilerBites is a React Native / Expo (SDK 54) iOS app for Purdue University dining hall nutrition tracking. It uses TypeScript, Expo Router (file-based navigation), Supabase (hosted BaaS for auth + Postgres), and NativeWind/TailwindCSS for styling.

### Running in Headless Cloud VMs
This is primarily an iOS app. To run it in a browser for development/testing in a headless VM, you **must** change `app.json` → `expo.web.output` from `"static"` to `"single"`. The `"static"` mode triggers SSR which crashes because `@react-native-async-storage/async-storage` accesses `window.localStorage` at Supabase client initialization time (Node.js context has no `window`).

After changing to `"single"`:
```
npx expo start --web --port 8081
```

### Key Commands
| Task | Command |
|------|---------|
| Install deps | `npm install --legacy-peer-deps` |
| Lint | `npx expo lint` |
| Type check | `npx tsc --noEmit` |
| Dev server (web) | `npx expo start --web --port 8081` |
| Dev server (native) | `npx expo start` |

### Gotchas
- `npm install` (without `--legacy-peer-deps`) fails due to React 19.1 vs react-dom peer dependency conflicts. Always use `--legacy-peer-deps`.
- ESLint and `eslint-config-expo` must be installed as devDependencies (they are peer dependencies not listed in `package.json`). Run `npm install --save-dev eslint@9 eslint-config-expo --legacy-peer-deps` if `npx expo lint` reports `Cannot find module 'eslint'`.
- TypeScript reports pre-existing errors in Deno-based Supabase Edge Functions (`supabase/functions/`) due to missing Deno type declarations; these are expected and do not affect the app.
- The app fetches live Purdue dining hall menus from `api.hfs.purdue.edu` (public, no auth needed). The home screen, search, and dining hall pages work without Supabase credentials. Features requiring auth (diary, favorites, profile) need valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
- The `proxy-server/` directory contains a separate Express.js proxy for FatSecret API; it is independently deployed and not required for local development.
