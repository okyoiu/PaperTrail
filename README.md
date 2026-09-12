# RiceHack Quest

Pokémon-Go-style location game. Players walk around, a Shadow-of-War-style fog
lifts around real 3D buildings (rendered from OpenStreetMap data via
osmium-tool) as they explore, and they earn XP for leaving reviews at real
places (pulled from Google Places).

## Stack

- **Frontend**: React + Vite, packaged as an installable PWA (no App Store needed — open a URL on a phone, "Add to Home Screen").
- **Map/3D**: MapLibre GL JS + building footprints extracted from OpenStreetMap with `osmium-tool` (see `public/data/README.md`).
- **Places data**: Google Places API, proxied through `api/places.js` so the key never reaches the browser.
- **Backend/DB**: Supabase (Postgres + Auth + Storage) — see `supabase/README.md`.
- **Hosting**: Vercel free tier (instant HTTPS URL — required for geolocation/camera anyway). Once the GoDaddy domain is registered, point it at Vercel with a CNAME; doesn't block any development in the meantime.

## Team roles & ownership

Each role owns a folder — work in parallel without stepping on each other's files.

| Role | Owns | Key files |
|---|---|---|
| **Frontend / Map** | `src/features/map/` | `MapView.jsx` (MapLibre setup), `buildingsLayer.js` (3D extrusion), `FogOfWar.jsx` (canvas fog), also owns generating `public/data/buildings.geojson` via osmium-tool |
| **Backend / Data** | `src/features/backend/`, `src/features/game/`, `api/`, `supabase/` | `api.js` (Supabase calls), `xp.js` (leveling math), `places.js` (Google Places proxy), `schema.sql` (DB schema + RLS) |
| **Mobile** | `src/features/mobile/` | `useGeolocation.js`, `CameraCapture.jsx`, `InstallPrompt.jsx`, PWA manifest in `vite.config.js`, on-device testing/polish |

`src/App.jsx` is the shared wiring file — it imports from all three folders. Keep changes there small and coordinate before editing it, since it's the one place all three roles touch.

## Setup

```bash
npm install
cp .env.example .env   # fill in Supabase + Google Places keys
npm run dev
```

To test geolocation/camera on an actual phone, use a tunnel (e.g. `npx vercel dev` or ngrok) since those APIs require HTTPS.

## Deploy (for demoing without running locally)

```bash
npx vercel   # first time: link the project
npx vercel --prod
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `GOOGLE_PLACES_API_KEY` as environment variables in the Vercel project settings (not just `.env` — that file isn't deployed). Once the GoDaddy domain is registered, add it under Vercel → Project → Domains and update DNS at GoDaddy per Vercel's instructions.

## Day-1 checklist

1. Backend: create the Supabase project, run `supabase/schema.sql`, share keys with the team.
2. Frontend: pick the demo venue, run the osmium-tool extract, confirm 3D buildings render.
3. Mobile: deploy the empty scaffold to Vercel immediately so there's always a live demo link.
4. All: get a Google Places API key (Places API + Maps JavaScript API enabled) from Google Cloud Console, add to Vercel env vars.

## Open items

- **Persona-identity track**: not yet wired up — `profiles.persona_id` in the schema is a placeholder until we know what that integration requires.
- **GoDaddy domain**: registration prize only, no hosting included — Vercel is the actual host; the domain just gets pointed at it once claimed.
