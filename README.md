# Paper Trail

Pokémon-Go-style location game. Players pick an explorer, walk around, and a
Shadow-of-War-style fog lifts around real 3D buildings (rendered from
OpenStreetMap data via osmium-tool) as they explore. Leaving a review at a
place earns XP and paints that building in the "explored" color, saved to the
database so it's there on every device. Signed-in players see each other's
characters walking the map live; each player chooses on their Profile tab
whether everyone or only accepted friends can see them.

## Stack

- **Frontend**: React + Vite, packaged as an installable PWA (no App Store needed — open a URL on a phone, "Add to Home Screen"). Routed as a small mobile app: Map / Friends / Login tabs (`src/pages/`, `src/App.jsx`).
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
| **Social / App shell** | `src/pages/`, `src/components/`, `src/features/social/` | Character-select sign-in (`SignIn.jsx`, email code or magic link), Profile tab (`PlayerCard.jsx`, `LocationVisibility.jsx`), friend requests, other players on the map (`hooks/usePlayersMap.js`, `map/remotePlayerMarker.js`) |

`src/App.jsx` is the shared wiring file — it renders the page router. Keep changes there small and coordinate before editing it, since it's the one place every role touches.

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

## How the map state is stored

- `unlocks` is one row per player per place: `unlocked_at` when their character first
  walked up to it (fog lifts), `explored_at` when they first reviewed it (building turns
  the explored color). A trigger on `reviews` sets `explored_at`, so the two can't drift.
- `live_locations` is one row per player, overwritten every few seconds while the app is
  open; players not heard from in 10 minutes drop off the map. Who can read which row is
  decided by row-level security from `profiles.location_visibility`.

## Day-1 checklist

1. Backend: create the Supabase project, run `supabase/schema.sql`, share keys with the team.
2. Frontend: pick the demo venue, run the osmium-tool extract, confirm 3D buildings render.
3. Mobile: deploy the empty scaffold to Vercel immediately so there's always a live demo link.
4. All: get a Google Places API key (Places API + Maps JavaScript API enabled) from Google Cloud Console, add to Vercel env vars.

## Persona identity verification (challenge track)

Groundwork is in place; it stays completely inert until two env vars are set, so
the app builds and runs unchanged when Persona isn't wired up.

- **What it does**: a player can verify their identity through Persona's hosted
  Inquiry flow and earn a "verified explorer" badge. The completed inquiry id is
  saved to `profiles.persona_id` (column already in `schema.sql`).
- **Where it lives**: `src/services/persona.js` (loads the Persona SDK on demand
  and opens the inquiry), `setPersonaId()` in `src/features/backend/api.js`
  (persists it), and `src/features/social/VerifyIdentity.jsx` (the Profile-tab
  button/badge). In dev the section shows a "not configured" hint so it's
  discoverable; in production it hides until configured.
- **To turn it on**:
  1. Create an Inquiry template in the Persona dashboard and copy its template id
     (`itmpl_…`) and environment id (`env_…`).
  2. Set `VITE_PERSONA_TEMPLATE_ID` and `VITE_PERSONA_ENVIRONMENT_ID` in `.env`
     (and in Vercel env vars for the deployed build).
  3. The "Verify with Persona" button then appears on the Profile tab.
- **Trust note**: the client-side inquiry result is fine for a demo badge, but
  isn't tamper-proof. For anything gated on real verification, confirm the
  inquiry server-side via a Persona webhook or the Persona API before granting
  it — that's the natural next step and where a small serverless function under
  `api/` would go.

## Open items

- **GoDaddy domain**: registration prize only, no hosting included — Vercel is the actual host; the domain just gets pointed at it once claimed.
